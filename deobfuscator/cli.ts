#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  statSync,
  cpSync,
} from "fs";
import {
  applyRenames,
  extractVariables,
  isObfuscated,
  parseCode,
} from "./ast-utils.js";
import {
  loadSplitterConfig,
  generateModuleAssignments,
} from "./splitter-config.js";
import {
  loadConfig,
  resolveLLMConfig,
  resolvePath,
  getRoot,
} from "./config.js";
import { applyTransforms, generateTransforms } from "./transformer.js";
import { deobfuscate, copyExtras } from "./deobfuscator.js";
import { splitIntoModules } from "./splitter.js";
import type { TransformsFile } from "./types.js";
import { cloneOrUpdate } from "./downloader.js";
import { renameVariables } from "./renamer.js";
import { MappingStore } from "./mapping.js";
import _generate from "@babel/generator";
import { VERSIONS } from "./types.js";
import * as prettier from "prettier";
import { LLMClient } from "./llm.js";
import { resolve, join } from "path";
import { program } from "commander";
import * as t from "@babel/types";
import { log } from "./logger.js";
import { dirname } from "path";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (_generate as any).default ?? _generate;
import * as Diff from "diff";
import "dotenv/config";

async function processVersion(
  config: ReturnType<typeof loadConfig>,
  url: string,
  version: string,
  noLlm: boolean,
): Promise<boolean> {
  log("info", `=== Processing version ${version} ===`);

  const cloneDir = resolvePath(config, "clone_dir", "./.clone");
  const srcDir = resolvePath(config, "src_dir", "./src");
  const diffsDir = resolvePath(config, "diffs_dir", "./diffs");
  const targetFile = config.target_file || "content.js";
  const mappingPath = resolve(getRoot(), "mapping.json");
  const transformsPath = resolve(getRoot(), "transforms.json");

  const repoPath = cloneOrUpdate(url, version, cloneDir);
  const obfFile = join(repoPath, targetFile);
  if (!existsSync(obfFile)) {
    log("error", `Target file not found: ${obfFile}`);
    return false;
  }

  const { code: deobfCode } = await deobfuscate(obfFile);

  let transforms: TransformsFile;
  if (existsSync(transformsPath)) {
    transforms = JSON.parse(
      readFileSync(transformsPath, "utf-8"),
    ) as TransformsFile;
    log("info", `Loaded ${transforms.transforms.length} saved transforms`);
  } else {
    const llmConfig = resolveLLMConfig({
      ...config.llm,
      enabled: noLlm ? false : config.llm?.enabled,
    });
    transforms = await generateTransforms(deobfCode, llmConfig);
    writeFileSync(transformsPath, JSON.stringify(transforms, null, 2), "utf-8");
    log(
      "info",
      `Generated ${transforms.transforms.length} transforms -> transforms.json`,
    );
  }

  let transformedCode = applyTransforms(deobfCode, transforms);
  log("info", "Applied transforms");

  const variables = extractVariables(transformedCode);
  log(
    "info",
    `Extracted ${variables.length} obfuscated variables from transformed code`,
  );

  const mapping = new MappingStore(mappingPath);
  const llmConfig = resolveLLMConfig({
    ...config.llm,
    enabled: noLlm ? false : config.llm?.enabled,
  });

  const { resolved } = await renameVariables(
    transformedCode,
    variables,
    mapping,
    llmConfig,
  );

  let renamedCode = transformedCode;
  if (Object.keys(resolved).length > 0) {
    try {
      renamedCode = applyRenames(transformedCode, resolved);
      const remaining = (renamedCode.match(/\b_0x[a-f0-9]+\b/g) || []).length;
      log("info", `Applied renames (${remaining} _0x names remaining)`);
    } catch (e) {
      log("error", `Rename failed: ${(e as Error).message}`);
    }
  }

  const orphans = new Set<string>();
  const orphRe = /\b(_0x[a-f0-9]+)\b/g;
  let om: RegExpExecArray | null = orphRe.exec(renamedCode);
  while (om !== null) {
    orphans.add(om[1]!);
    om = orphRe.exec(renamedCode);
  }
  if (orphans.size > 0) {
    log("info", `Sweeping ${orphans.size} orphaned _0x identifiers`);
    const sweepMap: Record<string, string> = {};
    const usedSweepNames = new Set<string>();
    for (const obf of orphans) {
      const idx = renamedCode.indexOf(obf);
      const ctx = renamedCode.slice(Math.max(0, idx - 80), idx + 80);
      let base = "v";
      if (/\bdocument\b|\bquerySelector\b|\bcreateElement\b/.test(ctx))
        base = "dom";
      else if (/\bMath\.\b|\bparseInt\b|\bparseFloat\b/.test(ctx))
        base = "calc";
      else if (/\blocalStorage\b|\bsessionStorage\b/.test(ctx)) base = "store";
      let h = 0;
      for (let i = 0; i < obf.length; i++)
        h = ((h << 5) - h + obf.charCodeAt(i)) | 0;
      let name = `${base}_${(Math.abs(h) % 65536).toString(16)}`;
      if (usedSweepNames.has(name)) {
        let c = 2;
        while (usedSweepNames.has(`${name}_${c}`)) c++;
        name = `${name}_${c}`;
      }
      usedSweepNames.add(name);
      sweepMap[obf] = name;
    }
    for (const [obf, name] of Object.entries(sweepMap)) {
      renamedCode = renamedCode.replace(new RegExp(`\\b${obf}\\b`, "g"), name);
    }
    const remaining = (renamedCode.match(/\b_0x[a-f0-9]+\b/g) || []).length;
    log("info", `Sweep complete (${remaining} _0x names remaining)`);
  }

  mapping.data._meta.version = version;
  mapping.save();

  const splitterConfig = loadSplitterConfig();
  const validModules = new Set(Object.keys(splitterConfig.modules));

  const funcDecls: { name: string; code: string }[] = [];
  const varDecls: { name: string; code: string }[] = [];
  const windowProps: string[] = [];

  let ast;
  try {
    ast = parseCode(renamedCode);
  } catch (e) {
    log("error", `Failed to parse renamed code: ${(e as Error).message}`);
    // Save problematic code for debugging
    const debugPath = resolve(getRoot(), `debug_v${version}_parse_error.js`);
    try {
      writeFileSync(debugPath, renamedCode, "utf-8");
      log("info", `Saved problematic code to ${debugPath}`);
    } catch {
      /* ignore write errors */
    }
    return false;
  }
  for (const stmt of ast.program.body) {
    if (t.isFunctionDeclaration(stmt) && stmt.id) {
      funcDecls.push({
        name: stmt.id.name,
        code: (generate as any)(stmt).code,
      });
    } else if (t.isVariableDeclaration(stmt)) {
      for (const decl of stmt.declarations) {
        if (t.isIdentifier(decl.id)) {
          const isFunc =
            t.isFunctionExpression(decl.init) ||
            t.isArrowFunctionExpression(decl.init);
          (isFunc ? funcDecls : varDecls).push({
            name: decl.id.name,
            code: `${stmt.kind} ${(generate as any)(decl).code};`,
          });
        }
      }
    } else if (
      t.isExpressionStatement(stmt) &&
      t.isAssignmentExpression(stmt.expression) &&
      stmt.expression.operator === "=" &&
      t.isMemberExpression(stmt.expression.left) &&
      t.isIdentifier(stmt.expression.left.object) &&
      stmt.expression.left.object.name === "window" &&
      t.isIdentifier(stmt.expression.left.property)
    ) {
      windowProps.push(stmt.expression.left.property.name);
    }
  }

  let assignedFuncs = 0;
  let assignedVars = 0;
  for (const f of funcDecls) {
    const existing = Object.values(mapping.data.functions).find(
      (e) => e.name === f.name,
    );
    if (existing?.module && validModules.has(existing.module)) assignedFuncs++;
  }
  for (const v of varDecls) {
    const existing = Object.values(mapping.data.variables).find(
      (e) => e.name === v.name,
    );
    if (existing?.module && validModules.has(existing.module)) assignedVars++;
  }

  const totalItems = funcDecls.length + varDecls.length;
  const assignedItems = assignedFuncs + assignedVars;
  const cacheRatio = totalItems > 0 ? assignedItems / totalItems : 0;

  if (llmConfig.enabled && cacheRatio < 0.9) {
    const missingFuncs = funcDecls.filter((f) => {
      const existing = Object.values(mapping.data.functions).find(
        (e) => e.name === f.name,
      );
      return !existing?.module || !validModules.has(existing.module);
    });
    const missingVars = varDecls.filter((v) => {
      const existing = Object.values(mapping.data.variables).find(
        (e) => e.name === v.name,
      );
      return !existing?.module || !validModules.has(existing.module);
    });

    const missingCount = missingFuncs.length + missingVars.length;
    log(
      "info",
      `Module assignment cache: ${assignedItems}/${totalItems} cached (${Math.round(cacheRatio * 100)}%), ${missingCount} need LLM`,
    );

    if (missingCount > 100) {
      log(
        "warn",
        `Too many unassigned items (${missingCount}), skipping LLM module assignment to avoid timeouts. Assigning to "core" module.`,
      );
      for (const f of missingFuncs) {
        const existing = Object.values(mapping.data.functions).find(
          (e) => e.name === f.name,
        );
        if (existing) existing.module = "core";
      }
      for (const v of missingVars) {
        const existing = Object.values(mapping.data.variables).find(
          (e) => e.name === v.name,
        );
        if (existing) existing.module = "core";
      }
      mapping.save();
    } else {
      const llm = new LLMClient(llmConfig);
      const {
        functionAssignments,
        variableAssignments,
        windowPropAssignments,
      } = await generateModuleAssignments(
        llm,
        {
          functions: missingFuncs,
          variables: missingVars,
          windowProps,
        },
        splitterConfig,
      );

      for (const [name, mod] of Object.entries(functionAssignments)) {
        const existing = Object.values(mapping.data.functions).find(
          (e) => e.name === name,
        );
        if (existing) {
          existing.module = mod;
        }
      }
      for (const [name, mod] of Object.entries(variableAssignments)) {
        const existing = Object.values(mapping.data.variables).find(
          (e) => e.name === name,
        );
        if (existing) {
          existing.module = mod;
        }
      }
      mapping.save();
    }
  } else if (llmConfig.enabled) {
    log(
      "info",
      `Module assignment cache: ${assignedItems}/${totalItems} cached (${Math.round(cacheRatio * 100)}%), skipping LLM`,
    );
  }

  log("info", "Splitting into modules");
  const splitResult = await splitIntoModules(
    renamedCode,
    mapping,
    splitterConfig,
  );

  mkdirSync(srcDir, { recursive: true });

  const modulesDir = join(srcDir, "src");
  mkdirSync(modulesDir, { recursive: true });

  const oldModuleFiles = new Map<string, string>();
  if (existsSync(modulesDir)) {
    for (const f of readdirSync(modulesDir, { recursive: true }).filter((f) =>
      (f as string).endsWith(".js"),
    )) {
      oldModuleFiles.set(
        (f as string).replace(/\\/g, "/"),
        readFileSync(join(modulesDir, f as string), "utf-8"),
      );
    }
  }

  const newPaths = new Set(splitResult.modules.map((m) => m.path));

  for (const mod of splitResult.modules) {
    const modPath = join(modulesDir, mod.path);
    mkdirSync(dirname(modPath), { recursive: true });
    writeFileSync(modPath, mod.code, "utf-8");
    log("info", `  src/${mod.path} (${mod.exports.length} exports)`);
  }

  for (const oldPath of oldModuleFiles.keys()) {
    if (!newPaths.has(oldPath)) {
      const fullPath = join(modulesDir, oldPath);
      if (existsSync(fullPath)) {
        rmSync(fullPath);
        log("info", `  removed old module: ${oldPath}`);
      }
    }
  }
  // Clean up empty subdirectories left by removed modules
  for (const subDir of readdirSync(modulesDir, { withFileTypes: true })) {
    if (subDir.isDirectory()) {
      const subPath = join(modulesDir, subDir.name);
      const remaining = readdirSync(subPath, { recursive: true }).filter((f) =>
        (f as string).endsWith(".js"),
      );
      if (remaining.length === 0) {
        rmSync(subPath, { recursive: true });
        log("info", `  removed empty directory: ${subDir.name}/`);
      }
    }
  }
  writeFileSync(join(srcDir, "content.js"), splitResult.entry, "utf-8");
  log("info", `  content.js`);

  if (oldModuleFiles.size > 0) {
    mkdirSync(diffsDir, { recursive: true });
    for (const mod of splitResult.modules) {
      const oldCode = oldModuleFiles.get(mod.path);
      if (oldCode && oldCode !== mod.code) {
        const diffPath = join(diffsDir, `v${version}_${mod.name}.diff`);
        const patch = Diff.createPatch(
          mod.path,
          oldCode,
          mod.code,
          `v${mapping.data._meta.version || "prev"}`,
          `v${version}`,
        );
        writeFileSync(diffPath, patch, "utf-8");
        log("info", `  Diff: ${mod.path} -> ${diffPath}`);
      }
    }
  }

  copyExtras(repoPath, srcDir);

  const prettierConfig =
    (await prettier.resolveConfig(resolve(getRoot(), ".prettierrc"))) ?? {};

  // Format generated extension files with Prettier
  const formatFiles = async (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await formatFiles(fullPath);
      } else if (entry.name.endsWith(".js") || entry.name.endsWith(".json")) {
        try {
          const raw = readFileSync(fullPath, "utf-8");
          const formatted = await prettier.format(raw, {
            ...prettierConfig,
            filepath: fullPath,
          });
          writeFileSync(fullPath, formatted, "utf-8");
        } catch (e) {
          log(
            "warn",
            `  Prettier failed for ${fullPath}: ${(e as Error).message}`,
          );
        }
      }
    }
  };
  await formatFiles(srcDir);

  // Also format mapping.json and transforms.json
  for (const jsonPath of [mappingPath, transformsPath]) {
    if (existsSync(jsonPath)) {
      try {
        const raw = readFileSync(jsonPath, "utf-8");
        const formatted = await prettier.format(raw, {
          ...prettierConfig,
          filepath: jsonPath,
        });
        writeFileSync(jsonPath, formatted, "utf-8");
      } catch (e) {
        log(
          "warn",
          `  Prettier failed for ${jsonPath}: ${(e as Error).message}`,
        );
      }
    }
  }

  log("info", "  Formatted with Prettier");

  log(
    "info",
    `=== Version ${version} done: ${splitResult.modules.length} modules ===`,
  );
  return true;
}

function showStatus(config: ReturnType<typeof loadConfig>): void {
  const mappingPath = resolve(getRoot(), "mapping.json");
  const mapping = new MappingStore(mappingPath);
  const diffsDir = resolvePath(config, "diffs_dir", "./diffs");
  const funcCount = Object.keys(mapping.data.functions).length;
  const varCount = Object.keys(mapping.data.variables).length;
  console.log(`Version: ${mapping.data._meta.version || "N/A"}`);
  console.log(`Updated: ${mapping.data._meta.lastUpdated || "N/A"}`);
  console.log(`Functions: ${funcCount}`);
  console.log(`Variables: ${varCount}`);
  if (existsSync(diffsDir)) {
    const diffs = readdirSync(diffsDir)
      .filter((f) => f.endsWith(".diff"))
      .sort();
    console.log(`Diffs: ${diffs.length}`);
    for (const d of diffs)
      console.log(`  ${d} (${statSync(join(diffsDir, d)).size} bytes)`);
  }
}

function generateCombinedPatch(
  oldDir: string,
  newDir: string,
  oldLabel: string,
  newLabel: string,
): string {
  const patches: string[] = [];

  function walk(dir: string, prefix: string): Map<string, string> {
    const files = new Map<string, string>();
    if (!existsSync(dir)) return files;

    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const subFiles = walk(fullPath, relPath);
        for (const [k, v] of subFiles) files.set(k, v);
      } else if (
        entry.isFile() &&
        (entry.name.endsWith(".js") || entry.name.endsWith(".json"))
      ) {
        files.set(relPath, readFileSync(fullPath, "utf-8"));
      }
    }
    return files;
  }

  const oldFiles = walk(oldDir, "");
  const newFiles = walk(newDir, "");

  const allPaths = new Set([...oldFiles.keys(), ...newFiles.keys()]);
  const sorted = [...allPaths].sort();

  for (const path of sorted) {
    const oldContent = oldFiles.get(path) ?? "";
    const newContent = newFiles.get(path) ?? "";

    if (oldContent === newContent) continue;

    patches.push(
      Diff.createPatch(path, oldContent, newContent, oldLabel, newLabel),
    );
  }

  return patches.join("");
}

program
  .name("deobfuscate")
  .description("Astraphobia Client Deobfuscator")
  .version("1.0.0");

program
  .command("process")
  .description("Deobfuscate a single version")
  .option("--repo <url>", "Repository URL")
  .option("--ver <ver>", "Version label")
  .option("--no-llm", "Skip LLM renaming")
  .option("--config <path>", "Config file path", "config.json")
  .action(async (opts) => {
    const config = loadConfig(opts.config);
    const url = opts.repo || config.target_repo;
    const version = opts.ver || config.repo_name || "unknown";
    if (!url) {
      log("error", "No repository URL");
      process.exit(1);
    }
    await processVersion(config, url, version, !opts.llm);
  });

program
  .command("batch")
  .description("Process all versions in order")
  .option("--start <ver>", "Start version", "1.1")
  .option("--end <ver>", "End version", "1.9")
  .option("--no-llm", "Skip LLM renaming")
  .option("--config <path>", "Config file path", "config.json")
  .action(async (opts) => {
    const config = loadConfig(opts.config);
    const sorted = Object.keys(VERSIONS).sort(
      (a, b) => parseFloat(a) - parseFloat(b),
    );
    let processing = false;
    for (const v of sorted) {
      if (v === opts.start) processing = true;
      if (!processing) continue;
      log("cyan", `=== Batch: v${v} ===`);
      if (VERSIONS[v]) await processVersion(config, VERSIONS[v]!, v, !opts.llm);
      if (v === opts.end) break;
    }
  });

program
  .command("backward")
  .description(
    "Process versions backwards (newest first), building history/ and patches",
  )
  .option("--start <ver>", "Canonical (newest) version to start from", "1.9")
  .option("--end <ver>", "Earliest version to process", "1.1")
  .option("--no-llm", "Skip LLM renaming")
  .option("--config <path>", "Config file path", "config.json")
  .option("--fresh", "Clear mapping.json and transforms.json before starting")
  .action(async (opts) => {
    const config = loadConfig(opts.config);
    const sorted = Object.keys(VERSIONS).sort(
      (a, b) => parseFloat(a) - parseFloat(b),
    );

    const startNum = parseFloat(opts.start);
    const endNum = parseFloat(opts.end);

    const versions = sorted
      .filter((v) => {
        const n = parseFloat(v);
        return n >= endNum && n <= startNum;
      })
      .reverse();

    if (versions.length === 0) {
      log("error", "No versions to process");
      process.exit(1);
    }

    const historyDir = resolve(getRoot(), "history");
    const historyDiffsDir = join(historyDir, "diffs");
    const mappingPath = resolve(getRoot(), "mapping.json");
    const transformsPath = resolve(getRoot(), "transforms.json");

    if (opts.fresh) {
      if (existsSync(mappingPath)) {
        rmSync(mappingPath);
        log("info", "Cleared mapping.json");
      }
      if (existsSync(transformsPath)) {
        rmSync(transformsPath);
        log("info", "Cleared transforms.json");
      }
    }

    mkdirSync(historyDir, { recursive: true });
    mkdirSync(historyDiffsDir, { recursive: true });

    for (let i = 0; i < versions.length; i++) {
      const v = versions[i]!;
      log("cyan", `=== Backward [${i + 1}/${versions.length}]: v${v} ===`);

      if (VERSIONS[v]) {
        let ok = false;
        try {
          ok = await processVersion(config, VERSIONS[v]!, v, !opts.llm);
        } catch (e) {
          log("error", `Failed to process v${v}: ${(e as Error).message}`);
        }
        if (!ok) {
          log("error", `Failed to process v${v}, continuing with next version`);
          continue;
        }
      }

      const srcDir = resolvePath(config, "src_dir", "./src");
      const verHistoryDir = join(historyDir, `v${v}`);
      if (existsSync(verHistoryDir)) {
        rmSync(verHistoryDir, { recursive: true });
      }
      cpSync(srcDir, verHistoryDir, { recursive: true });
      log("info", `Saved extension/ -> history/v${v}/`);

      if (i > 0) {
        const newerV = versions[i - 1]!;
        const olderDir = join(historyDir, `v${v}`);
        const newerDir = join(historyDir, `v${newerV}`);
        const patchPath = join(historyDiffsDir, `v${v}_to_v${newerV}.patch`);

        const patch = generateCombinedPatch(
          olderDir,
          newerDir,
          `v${v}`,
          `v${newerV}`,
        );
        writeFileSync(patchPath, patch, "utf-8");
        log(
          "info",
          `Generated patch: v${v}_to_v${newerV}.patch (${patch.length} bytes)`,
        );
      } else {
        // Check for an existing newer version in history/ to patch against
        const vNum = parseFloat(v);
        const newerV = sorted
          .filter((sv) => parseFloat(sv) > vNum)
          .sort((a, b) => parseFloat(a) - parseFloat(b))[0];
        if (newerV) {
          const newerDir = join(historyDir, `v${newerV}`);
          if (existsSync(newerDir)) {
            const olderDir = join(historyDir, `v${v}`);
            const patchPath = join(
              historyDiffsDir,
              `v${v}_to_v${newerV}.patch`,
            );
            const patch = generateCombinedPatch(
              olderDir,
              newerDir,
              `v${v}`,
              `v${newerV}`,
            );
            writeFileSync(patchPath, patch, "utf-8");
            log(
              "info",
              `Generated patch: v${v}_to_v${newerV}.patch (${patch.length} bytes)`,
            );
          }
        }
      }
    }

    log("info", `Backward processing complete. History saved to ${historyDir}`);
  });

program
  .command("status")
  .description("Show mapping status")
  .option("--config <path>", "Config file path", "config.json")
  .action((opts) => {
    showStatus(loadConfig(opts.config));
  });

program
  .command("extract")
  .description("Extract variables from a JS file")
  .argument("<file>", "JavaScript file to analyze")
  .action(async (file: string) => {
    const { extractVariables } = await import("./ast-utils.js");
    const code = readFileSync(resolve(file), "utf-8");
    console.log(JSON.stringify(extractVariables(code), null, 2));
  });

program
  .command("rename")
  .description("Apply a variable mapping to a JS file")
  .argument("<file>", "JavaScript file")
  .argument("<mapping>", "Mapping JSON file")
  .action(async (file: string, mappingFile: string) => {
    const { applyRenames } = await import("./ast-utils.js");
    const code = readFileSync(resolve(file), "utf-8");
    const nameMapping = JSON.parse(readFileSync(resolve(mappingFile), "utf-8"));
    process.stdout.write(applyRenames(code, nameMapping));
  });

program
  .command("dedupe")
  .description(
    "Post-process mapping.json to merge duplicate function/variable entries with identical DNA/role fingerprints but different names",
  )
  .option("--config <path>", "Config file path", "config.json")
  .action(async (opts) => {
    const mappingPath = resolve(getRoot(), "mapping.json");
    const mapping = new MappingStore(mappingPath);

    const fnMerged = mapping.mergeDuplicateFunctions();
    log("info", `Merged ${fnMerged} duplicate function entries`);

    const varMerged = mapping.mergeDuplicateVariables();
    log("info", `Merged ${varMerged} duplicate variable entries`);

    if (fnMerged > 0 || varMerged > 0) {
      mapping.save();
      log("info", "Saved deduplicated mapping.json");
    } else {
      log("info", "No duplicates found");
    }
  });

program.parse();
