#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "fs";
import {
  loadConfig,
  resolveLLMConfig,
  resolvePath,
  getRoot,
} from "./config.js";
import { applyRenames, extractVariables, isObfuscated } from "./ast-utils.js";
import { applyTransforms, generateTransforms } from "./transformer.js";
import { deobfuscate, copyExtras } from "./deobfuscator.js";
import { splitIntoModules } from "./splitter.js";
import type { TransformsFile } from "./types.js";
import { cloneOrUpdate } from "./downloader.js";
import { renameVariables } from "./renamer.js";
import { MappingStore } from "./mapping.js";
import { VERSIONS } from "./types.js";
import { resolve, join } from "path";
import { program } from "commander";
import { log } from "./logger.js";
import { dirname } from "path";
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

  log("info", "Splitting into modules");
  const splitResult = await splitIntoModules(renamedCode, mapping, llmConfig);

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

program.parse();
