import { isBootstrapFunction as isBootstrapFromConfig } from "./splitter-config.js";
import type { ModuleFile, SplitResult, SplitterConfig } from "./types.js";
import { MappingStore } from "./mapping.js";
import { parseCode } from "./ast-utils.js";
import _generate from "@babel/generator";
import * as t from "@babel/types";
import { log } from "./logger.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (_generate as any).default ?? _generate;

function guessModuleFromConfig(
  code: string,
  name: string,
  config: SplitterConfig,
): string {
  const moduleNames = Object.keys(config.modules);
  const scores: Record<string, number> = {};

  for (const modName of moduleNames) {
    let score = 0;
    const keywords = modName.split(/[_\-\s]+/);
    for (const kw of keywords) {
      if (kw.length < 3) continue;
      const re = new RegExp(kw, "gi");
      const matches = code.match(re);
      if (matches) score += matches.length * 2;
    }
    const def = config.modules[modName];
    if (def?.description) {
      for (const descWord of def.description.split(/[,\s]+/)) {
        if (descWord.length < 3) continue;
        const re = new RegExp(descWord, "gi");
        const matches = code.match(re);
        if (matches) score += matches.length;
      }
    }
    if (score > 0) scores[modName] = score;
  }

  if (name) {
    const nameLower = name.toLowerCase();
    for (const modName of moduleNames) {
      const keywords = modName.split(/[_\-\s]+/);
      for (const kw of keywords) {
        if (kw.length >= 3 && nameLower.includes(kw.toLowerCase())) {
          scores[modName] = (scores[modName] ?? 0) + 5;
        }
      }
    }
  }

  let bestModule = "core";
  let bestScore = 0;
  for (const [mod, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestModule = mod;
    }
  }

  return bestScore >= config.scoreThreshold ? bestModule : "core";
}

function collectWindowInits(
  code: string,
  moduleFiles: ModuleFile[],
  config: SplitterConfig,
): void {
  const windowInits: { propName: string; statement: string }[] = [];

  const ast = parseCode(code);
  for (const stmt of ast.program.body) {
    if (
      !t.isExpressionStatement(stmt) ||
      !t.isAssignmentExpression(stmt.expression) ||
      stmt.expression.operator !== "="
    )
      continue;
    const left = stmt.expression.left;
    if (!t.isMemberExpression(left)) continue;
    if (!t.isIdentifier(left.object) || left.object.name !== "window") continue;
    if (!t.isIdentifier(left.property)) continue;
    const propName = left.property.name;
    const stmtCode = (generate as any)(stmt).code;
    windowInits.push({ propName, statement: stmtCode });
  }

  if (windowInits.length === 0) return;

  const initsByModule = new Map<ModuleFile, string[]>();
  const moduleNames = Object.keys(config.modules);

  for (const { propName, statement } of windowInits) {
    let bestMod: ModuleFile | null = null;
    const guessMod = guessModuleFromConfig(propName, propName, config);
    if (guessMod !== "core") {
      bestMod = moduleFiles.find((m) => m.name === guessMod) ?? null;
    }
    if (!bestMod) {
      const re = new RegExp(`window\\.${propName}\\b`);
      let bestCount = 0;
      for (const mod of moduleFiles) {
        const matches = mod.code.match(re);
        if (matches && matches.length > bestCount) {
          bestCount = matches.length;
          bestMod = mod;
        }
      }
    }
    if (bestMod) {
      if (!initsByModule.has(bestMod)) initsByModule.set(bestMod, []);
      const inits = initsByModule.get(bestMod)!;
      if (!inits.some((i) => i.trim() === statement.trim())) {
        inits.push(statement);
      }
    }
  }

  for (const [mod, inits] of initsByModule) {
    const lines = mod.code.split("\n");
    let lastImportIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^import\s/.test(lines[i]!)) lastImportIdx = i;
    }
    const block = inits.join("\n") + "\n";
    lines.splice(lastImportIdx + 1, 0, "", block);
    mod.code = lines.join("\n");
  }
}

function optimizeLetToConst(code: string): string {
  const topLetRe = /^(?:export\s+)?let\s+([A-Za-z_$][\w$]*)\s*=/gm;
  const letNames: string[] = [];
  let m: RegExpExecArray | null;
  m = topLetRe.exec(code);
  while (m !== null) {
    letNames.push(m[1]!);
    m = topLetRe.exec(code);
  }

  const exportedNames = new Set<string>();
  const exportBlockRe = /export\s*\{([^}]+)\}/g;
  let em: RegExpExecArray | null;
  em = exportBlockRe.exec(code);
  while (em !== null) {
    for (const part of em[1]!.split(",")) {
      const name = part
        .trim()
        .split(/\s+as\s+/)[0]!
        .trim();
      if (name) exportedNames.add(name);
    }
    em = exportBlockRe.exec(code);
  }

  const reassigned = new Set<string>();
  const assignRe = /\b([A-Za-z_$][\w$]*)\s*(?:[+\-*/%&|^]|<<|>>)?=(?!=)/g;
  let am: RegExpExecArray | null;
  am = assignRe.exec(code);
  while (am !== null) {
    const varName = am[1]!;
    const start = Math.max(0, am.index - 30);
    const context = code.slice(start, am.index + am[0].length + 5);
    if (!/\b(?:let|const|var)\s+\w/.test(context)) {
      reassigned.add(varName);
    }
    am = assignRe.exec(code);
  }

  let result = code;
  for (const name of letNames) {
    if (!reassigned.has(name) && !exportedNames.has(name)) {
      result = result.replace(
        new RegExp(`\\blet\\s+${name}\\b`, "g"),
        `const ${name}`,
      );
    }
  }
  return result;
}

function relativePath(from: string, to: string): string {
  const fromParts = from.split("/");
  const toParts = to.split("/");
  const commonLen = (() => {
    for (let i = 0; i < Math.min(fromParts.length, toParts.length); i++) {
      if (fromParts[i] !== toParts[i]) return i;
    }
    return Math.min(fromParts.length, toParts.length);
  })();
  const ups = fromParts.length - commonLen - 1;
  const downs = toParts.slice(commonLen);
  const rel: string[] = [];
  for (let i = 0; i < ups; i++) rel.push("..");
  rel.push(...downs);
  const result = rel.join("/") || ".";
  return result;
}

function getModulePath(config: SplitterConfig, modName: string): string {
  return config.modules[modName]?.path ?? modName;
}

function replaceOutsideStrings(
  code: string,
  varName: string,
  replacement: string,
): string {
  const regions: { start: number; end: number }[] = [];
  for (let i = 0; i < code.length; i++) {
    const ch = code[i]!;
    if (ch === '"' || ch === "'" || ch === "`") {
      const quote = ch;
      let j = i + 1;
      while (j < code.length) {
        if (code[j] === "\\") {
          j += 2;
          continue;
        }
        if (code[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      regions.push({ start: i, end: j });
      i = j - 1;
    }
  }
  const inString = (idx: number): boolean =>
    regions.some((r) => idx >= r.start && idx < r.end);

  const re = new RegExp(
    `(?<![\\w$.]|(?:let|const|var)\\s+)${varName}(?![\\w$])`,
    "g",
  );
  let m: RegExpExecArray | null;
  const parts: string[] = [];
  let lastIdx = 0;
  m = re.exec(code);
  while (m !== null) {
    if (!inString(m.index)) {
      parts.push(code.slice(lastIdx, m.index));
      parts.push(replacement);
      lastIdx = m.index + m[0]!.length;
    }
    m = re.exec(code);
  }
  parts.push(code.slice(lastIdx));
  return parts.join("");
}

function fixSharedMutableState(modules: ModuleFile[]): void {
  const letDeclRe = /^\s*let\s+([A-Za-z_$][\w$]*)\s*[=;]/gm;
  const exportBlockRe = /export\s*\{([^}]+)\}/;
  const moduleMap = new Map(modules.map((m) => [m.name, m]));

  const needsState = new Map<string, Set<string>>();

  for (const mod of modules) {
    letDeclRe.lastIndex = 0;
    const letNames = new Set<string>();
    let m: RegExpExecArray | null;
    m = letDeclRe.exec(mod.code);
    while (m !== null) {
      letNames.add(m[1]!);
      m = letDeclRe.exec(mod.code);
    }

    const exportMatch = mod.code.match(exportBlockRe);
    if (!exportMatch) continue;
    const exported = new Set<string>();
    for (const p of exportMatch[1]!.split(",")) {
      const n = p
        .trim()
        .split(/\s+as\s+/)[0]!
        .trim();
      if (n) exported.add(n);
    }

    for (const vn of letNames) {
      if (!exported.has(vn)) continue;
      for (const other of modules) {
        if (other.name === mod.name) continue;
        const otherPath = other.path.replace(/\.js$/, "");
        const thisPath = mod.path.replace(/\.js$/, "");
        const importRel = relativePath(otherPath, thisPath);
        const importPrefix = importRel.startsWith("..") ? "" : "./";
        const fullImportPath = `${importPrefix}${importRel}.js`;
        const escapedPath = fullImportPath.replace(/\./g, "\\.");
        if (
          !new RegExp(
            `import\\s*\\{[^}]*\\b${vn}\\b[^}]*\\}\\s*from\\s*['"]${escapedPath}['"]`,
          ).test(other.code)
        )
          continue;
        const hasReassign = new RegExp(
          `(?<![\\w$.])${vn}\\s*(?:[+\\-*/%&|^]|<<|>>)?=(?!=)`,
        ).test(other.code);
        const hasDecl = new RegExp(`\\b(?:let|const|var)\\s+${vn}\\b`).test(
          other.code,
        );
        if (hasReassign && !hasDecl) {
          if (!needsState.has(mod.name)) needsState.set(mod.name, new Set());
          needsState.get(mod.name)!.add(vn);
        }
      }
    }
  }

  if (needsState.size === 0) return;

  const stateNames = new Map<string, string>();
  for (const ownerName of needsState.keys()) {
    const stateName =
      ownerName === "core" ? "state" : `${ownerName.replace(/_/g, "")}State`;
    stateNames.set(ownerName, stateName);
  }

  for (const [ownerName, varNames] of needsState) {
    const owner = moduleMap.get(ownerName)!;
    const stateName = stateNames.get(ownerName)!;

    const stateEntries: string[] = [];
    for (const vn of varNames) {
      const initMatch = owner.code.match(
        new RegExp(`^\\s*let\\s+${vn}\\s*=\\s*(.+?);\\s*$`, "m"),
      );
      stateEntries.push(
        `  ${vn}: ${initMatch ? initMatch[1]!.trim() : "null"}`,
      );
      owner.code = owner.code.replace(
        new RegExp(`^\\s*let\\s+${vn}\\s*(=.+)?;\\s*$`, "m"),
        "",
      );
    }

    const exportMatch = owner.code.match(exportBlockRe);
    const remainingExports = exportMatch
      ? exportMatch[1]!
          .split(",")
          .map((n) => n.trim())
          .filter((n) => !varNames.has(n.split(" as ")[0]!.trim()))
      : [];
    owner.exports = [...remainingExports, stateName];

    owner.code = owner.code.replace(/export\s*\{[^}]+\};?\s*/, "");

    for (const mod of modules) {
      if (mod.name !== ownerName) {
        const modPath = mod.path.replace(/\.js$/, "");
        const ownerPath = owner.path.replace(/\.js$/, "");
        const rel = relativePath(modPath, ownerPath);
        const importPrefix = rel.startsWith("..") ? "" : "./";
        const fullImportPath = `${importPrefix}${rel}.js`;
        const escapedPath = fullImportPath.replace(/\./g, "\\.");
        mod.code = mod.code.replace(
          new RegExp(
            `import\\s*\\{([^}]*)\\}\\s*from\\s*['"]${escapedPath}['"];?`,
          ),
          (_match, list: string) => {
            const kept = list
              .split(",")
              .map((n: string) => n.trim())
              .filter((n: string) => !varNames.has(n.split(" as ")[0]!.trim()));
            return kept.length > 0
              ? `import { ${kept.join(", ")}, ${stateName} } from '${fullImportPath}';`
              : `import { ${stateName} } from '${fullImportPath}';`;
          },
        );
        for (const vn of varNames) {
          mod.code = replaceOutsideStrings(mod.code, vn, `${stateName}.${vn}`);
        }
      }
    }

    for (const vn of varNames) {
      owner.code = replaceOutsideStrings(owner.code, vn, `${stateName}.${vn}`);
    }

    owner.code =
      owner.code.trimEnd() +
      `\n\nexport const ${stateName} = {\n${stateEntries.join(",\n")}\n};\n\n` +
      `export { ${remainingExports.join(", ")} };\n`;
  }
}

export async function splitIntoModules(
  code: string,
  mapping: MappingStore,
  config: SplitterConfig,
): Promise<SplitResult> {
  const ast = parseCode(code);

  const allDecls: {
    type: "variable" | "function" | "expression";
    name: string;
    code: string;
    node: t.Node;
  }[] = [];
  const allFuncNames = new Set<string>();
  let exprCounter = 0;

  for (const stmt of ast.program.body) {
    if (t.isFunctionDeclaration(stmt)) {
      const name = stmt.id?.name;
      if (!name) continue;
      allDecls.push({
        type: "function",
        name,
        code: (generate as any)(stmt).code,
        node: stmt,
      });
      allFuncNames.add(name);
    } else if (t.isVariableDeclaration(stmt)) {
      for (const decl of stmt.declarations) {
        const name = t.isIdentifier(decl.id) ? decl.id.name : null;
        if (!name) continue;
        const isFunc =
          t.isFunctionExpression(decl.init) ||
          t.isArrowFunctionExpression(decl.init);
        const kind = stmt.kind === "var" ? "var" : stmt.kind;
        const declCode = `${kind} ${(generate as any)(decl).code};`;
        allDecls.push({
          type: isFunc ? "function" : "variable",
          name,
          code: declCode,
          node: decl,
        });
        if (isFunc) allFuncNames.add(name);
      }
    } else if (t.isExpressionStatement(stmt)) {
      const code = (generate as any)(stmt).code;
      if (code.trim().length === 0) continue;
      const name = `__expr_${exprCounter++}`;
      allDecls.push({
        type: "expression",
        name,
        code,
        node: stmt,
      });
    }
  }

  if (allDecls.length === 0) {
    log("warn", "No declarations found in code");
    return { modules: [], entry: "" };
  }

  const funcDecls = allDecls.filter((d) => d.type === "function");
  const varDecls = allDecls.filter((d) => d.type === "variable");
  const exprDecls = allDecls.filter((d) => d.type === "expression");
  log(
    "info",
    `Found ${allDecls.length} declarations (${funcDecls.length} functions, ${varDecls.length} variables, ${exprDecls.length} expressions)`,
  );

  const nameToModule: Record<string, string> = {};

  const callGraph = new Map<string, Set<string>>();
  for (const decl of funcDecls) {
    const calls = new Set<string>();
    const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let m: RegExpExecArray | null = callRe.exec(decl.code);
    while (m !== null) {
      if (m[1] && allFuncNames.has(m[1]) && m[1] !== decl.name) calls.add(m[1]);
      m = callRe.exec(decl.code);
    }
    callGraph.set(decl.name, calls);
  }

  const reverseCallGraph = new Map<string, Set<string>>();
  for (const [caller, callees] of callGraph) {
    for (const callee of callees) {
      if (!reverseCallGraph.has(callee))
        reverseCallGraph.set(callee, new Set());
      reverseCallGraph.get(callee)!.add(caller);
    }
  }

  for (const decl of funcDecls) {
    const existing = Object.values(mapping.data.functions).find(
      (e) => e.name === decl.name,
    );
    const calls = callGraph.get(decl.name) ?? new Set();

    if (isBootstrapFromConfig(config, decl.name, calls.size)) {
      nameToModule[decl.name] = "core";
      if (existing) {
        existing.module = "core";
        mapping.save();
      }
      continue;
    }

    if (
      existing?.module &&
      existing.module !== "" &&
      config.modules[existing.module]
    ) {
      nameToModule[decl.name] = existing.module;
      continue;
    }

    const assigned = guessModuleFromConfig(decl.code, decl.name, config);
    nameToModule[decl.name] = assigned;
    if (existing) {
      existing.module = assigned;
      mapping.save();
    }
  }

  const varUsage = new Map<string, Set<string>>();
  for (const vDecl of varDecls) {
    const usedBy = new Set<string>();
    for (const fDecl of funcDecls) {
      const re = new RegExp(`\\b${vDecl.name}\\b`);
      if (re.test(fDecl.code)) usedBy.add(fDecl.name);
    }
    varUsage.set(vDecl.name, usedBy);
  }

  for (const vDecl of varDecls) {
    const existing =
      mapping.data.variables[
        Object.keys(mapping.data.variables).find(
          (k) => mapping.data.variables[k]?.name === vDecl.name,
        ) ?? ""
      ];
    if (existing?.module && config.modules[existing.module]) {
      nameToModule[vDecl.name] = existing.module;
      continue;
    }

    const users = varUsage.get(vDecl.name);
    if (!users || users.size === 0) {
      const assigned = guessModuleFromConfig(vDecl.code, vDecl.name, config);
      nameToModule[vDecl.name] = assigned;
      if (existing) existing.module = assigned;
      continue;
    }

    const userModules = new Set<string>();
    for (const fn of users) {
      const mod = nameToModule[fn];
      if (mod) userModules.add(mod);
    }

    if (userModules.size === 1) {
      nameToModule[vDecl.name] = [...userModules][0]!;
    } else {
      const assigned = guessModuleFromConfig(vDecl.code, vDecl.name, config);
      nameToModule[vDecl.name] = assigned;
    }

    if (existing) existing.module = nameToModule[vDecl.name]!;
  }
  mapping.save();

  for (const expr of exprDecls) {
    const mod = guessModuleFromConfig(expr.code, "", config);
    nameToModule[expr.name] = mod;
  }

  const modules: Record<string, { names: string[]; deps: Set<string> }> = {};
  const allModNames = new Set(Object.values(nameToModule));
  for (const modName of allModNames) {
    modules[modName] = { names: [], deps: new Set() };
  }

  for (const decl of allDecls) {
    const mod = nameToModule[decl.name] ?? "core";
    if (!modules[mod]) modules[mod] = { names: [], deps: new Set() };
    modules[mod]!.names.push(decl.name);
  }

  for (const [funcName, calls] of callGraph) {
    const myMod = nameToModule[funcName];
    if (!myMod) continue;
    for (const called of calls) {
      const calledMod = nameToModule[called];
      if (calledMod && calledMod !== myMod) modules[myMod]!.deps.add(calledMod);
    }
  }

  for (const [varName, users] of varUsage) {
    const varMod = nameToModule[varName];
    if (!varMod) continue;
    for (const fn of users) {
      const fnMod = nameToModule[fn];
      if (fnMod && fnMod !== varMod) modules[fnMod]!.deps.add(varMod);
    }
  }

  for (const expr of exprDecls) {
    const exprMod = nameToModule[expr.name];
    if (!exprMod) continue;
    const callRe = /\b([A-Za-z_$][\w$]*)\s*\(/g;
    let m: RegExpExecArray | null = callRe.exec(expr.code);
    while (m !== null) {
      if (m[1] && allFuncNames.has(m[1])) {
        const calledMod = nameToModule[m[1]];
        if (calledMod && calledMod !== exprMod) {
          modules[exprMod]!.deps.add(calledMod);
        }
      }
      m = callRe.exec(expr.code);
    }
  }

  const depOrder: string[] = [];
  const visited = new Set<string>();
  function visit(modName: string): void {
    if (visited.has(modName)) return;
    visited.add(modName);
    for (const dep of modules[modName]?.deps ?? []) visit(dep);
    depOrder.push(modName);
  }
  for (const modName of Object.keys(modules)) visit(modName);

  const moduleFiles: ModuleFile[] = [];
  for (const modName of depOrder) {
    const mod = modules[modName];
    if (!mod || mod.names.length === 0) continue;

    const imports: string[] = [];
    for (const dep of mod.deps) {
      const depMod = modules[dep];
      if (!depMod || depMod.names.length === 0) continue;
      const usedInThisMod = new Set<string>();
      for (const name of mod.names) {
        const decl = allDecls.find((d) => d.name === name);
        if (!decl) continue;
        for (const depName of depMod.names) {
          const re = new RegExp(`\\b${depName}\\b`);
          if (re.test(decl.code)) usedInThisMod.add(depName);
        }
      }
      if (usedInThisMod.size > 0) {
        const depPath = getModulePath(config, dep);
        const currentPath = getModulePath(config, modName);
        const rel = relativePath(currentPath, depPath);
        const prefix = rel.startsWith("..") ? "" : "./";
        imports.push(
          `import { ${[...usedInThisMod].join(", ")} } from '${prefix}${rel}.js';`,
        );
      }
    }

    const bodies = allDecls
      .filter((d) => mod.names.includes(d.name))
      .map((d) => d.code);
    const funcNamesInMod = mod.names.filter((n) =>
      funcDecls.some((fd) => fd.name === n),
    );
    const exports = funcNamesInMod.filter((n) => {
      for (const [, calls] of callGraph) {
        if (calls.has(n)) return true;
      }
      if (n.startsWith("initialize") || n === "initializeApplication")
        return true;
      return (
        modName === "core" ||
        modName === "utils" ||
        modName.startsWith("features_") ||
        modName.startsWith("ui_")
      );
    });

    const varExports = mod.names.filter(
      (n) =>
        varDecls.some((vd) => vd.name === n) &&
        [...(varUsage.get(n) ?? [])].some((fn) => nameToModule[fn] !== modName),
    );
    const allExports = [...new Set([...exports, ...varExports])];

    const rawCode = [
      ...imports,
      "",
      ...bodies,
      "",
      `export { ${allExports.join(", ")} };`,
      "",
    ].join("\n");
    const existingMod = moduleFiles.find(
      (m) => m.path === `${getModulePath(config, modName)}.js`,
    );
    if (existingMod) {
      existingMod.code =
        existingMod.code.trimEnd() + "\n\n" + bodies.join("\n") + "\n";
      existingMod.exports = [
        ...new Set([...existingMod.exports, ...allExports]),
      ];
      existingMod.imports = [...new Set([...existingMod.imports, ...mod.deps])];
    } else {
      moduleFiles.push({
        name: modName,
        path: `${getModulePath(config, modName)}.js`,
        code: optimizeLetToConst(rawCode),
        exports: allExports,
        imports: [...mod.deps],
      });
    }
  }

  fixSharedMutableState(moduleFiles);

  collectWindowInits(code, moduleFiles, config);

  const dedupedExports = new Map<
    string,
    { mod: ModuleFile; exports: string[] }
  >();
  const claimedNames = new Set<string>();
  for (const mod of moduleFiles) {
    if (mod.exports.length === 0) continue;
    const unique = mod.exports.filter((e) => !claimedNames.has(e));
    if (unique.length > 0) {
      for (const n of unique) claimedNames.add(n);
      dedupedExports.set(mod.name, { mod, exports: unique });
    }
  }

  const mainImports = [...dedupedExports.values()].map(
    ({ mod, exports }) =>
      `import { ${exports.join(", ")} } from './src/${mod.path}';`,
  );

  const initEntry = moduleFiles.find((m) =>
    m.exports.includes("initializeApplication"),
  );
  const hasInitInMain = mainImports.some((imp) =>
    imp.includes("initializeApplication"),
  );
  const initLines = hasInitInMain
    ? "initializeApplication();"
    : initEntry
      ? `import { initializeApplication } from './src/${initEntry.path}';\ninitializeApplication();`
      : "";

  const entry = [...mainImports, "", initLines, ""].join("\n");

  for (const [scopeKey, funcEntry] of Object.entries(mapping.data.functions)) {
    const mod = nameToModule[funcEntry.name];
    if (mod) funcEntry.module = mod;
  }
  mapping.save();

  return { modules: moduleFiles, entry };
}
