import {
  extractFunctionsWithContext,
  extractVarUsages,
  groupVariablesByFunction,
  isObfuscated,
} from "./ast-utils.js";
import type {
  VariableInfo,
  FunctionGroup,
  FunctionMappingEntry,
  LLMConfig,
} from "./types.js";
import { LLMClient, batchConcurrent } from "./llm.js";
import { MappingStore } from "./mapping.js";
import { log } from "./logger.js";

const AUTO_PREFIX_RE =
  /^(var_|arg_|fn_|dom_|calc_|iter_|safe_|math_|json_)[0-9a-f]{1,4}(_\d+)?$/;

function isAutoName(name: string): boolean {
  return AUTO_PREFIX_RE.test(name);
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

function makeAutoName(v: VariableInfo, autoNames: Set<string>): string {
  const fp = v.fingerprint || {};
  const vt = v.type;
  let prefix = vt.includes("function")
    ? "fn"
    : vt === "parameter"
      ? "arg"
      : "var";
  if (fp.callsDomApi) prefix = "dom";
  else if (fp.callsMathApi) prefix = "math";
  else if (fp.callsJsonApi) prefix = "json";
  else if (fp.hasTryCatch) prefix = "safe";
  if (vt.includes("function") && (fp.returnsCount ?? 0) > 0 && !fp.callsDomApi)
    prefix = "calc";
  if (fp.hasLoops) prefix = "iter";

  const base =
    Math.abs(hashStr(v.key || `${v.scope}::${v.originalName}`)) % 65536;
  let name = `${prefix}_${base.toString(16)}`;
  if (!autoNames.has(name)) {
    autoNames.add(name);
    return name;
  }
  let c = 2;
  while (autoNames.has(`${prefix}_${base.toString(16)}_${c}`)) c++;
  const final = `${prefix}_${base.toString(16)}_${c}`;
  autoNames.add(final);
  return final;
}

export interface RenameResult {
  resolved: Record<string, string>;
}

export async function renameVariables(
  code: string,
  variables: VariableInfo[],
  mapping: MappingStore,
  llmConfig: LLMConfig & { enabled: boolean; concurrency: number },
): Promise<RenameResult> {
  const funcGroups = groupVariablesByFunction(variables);
  const resolved: Record<string, string> = {};
  const usedGlobalNames = new Set<string>();
  const scopedNames = new Map<string, Set<string>>();
  const autoNames = new Set<string>();

  function getScopeFromKey(key: string): string {
    const idx = key.indexOf("::");
    return idx >= 0 ? key.slice(0, idx) : "global";
  }

  function claimName(key: string, name: string): string {
    const scope = getScopeFromKey(key);
    const isGlobal = scope === "global";
    if (isGlobal) {
      if (usedGlobalNames.has(name)) {
        let c = 2;
        while (usedGlobalNames.has(`${name}_${c}`)) c++;
        name = `${name}_${c}`;
      }
      usedGlobalNames.add(name);
      return name;
    }
    if (!scopedNames.has(scope)) scopedNames.set(scope, new Set());
    const names = scopedNames.get(scope)!;
    if (names.has(name)) {
      let c = 2;
      while (names.has(`${name}_${c}`)) c++;
      name = `${name}_${c}`;
    }
    names.add(name);
    return name;
  }

  const fpIndex = mapping.getFunctionFingerprintIndex();
  const matchedFunctions = new Map<
    string,
    { resolvedName: string; entry: FunctionMappingEntry; confidence: number }
  >();
  const unmatchedGroups: FunctionGroup[] = [];

  for (const [funcKey, group] of funcGroups) {
    if (!group.funcVar?.fingerprintHash) {
      unmatchedGroups.push(group);
      continue;
    }
    const existingEntry = mapping.data.functions[funcKey];
    if (
      existingEntry?.name &&
      existingEntry.fingerprintHash === group.funcVar.fingerprintHash
    ) {
      matchedFunctions.set(funcKey, {
        resolvedName: existingEntry.name,
        entry: existingEntry,
        confidence: 1.0,
      });
      continue;
    }
    let bestMatch: {
      resolvedName: string;
      entry: FunctionMappingEntry;
      confidence: number;
    } | null = null;
    for (const [resolvedName, fpEntry] of Object.entries(fpIndex)) {
      if (!fpEntry.fingerprintHash) continue;
      if (fpEntry.fingerprintHash !== group.funcVar.fingerprintHash) continue;
      const mapKey = Object.keys(mapping.data.functions).find(
        (k) => mapping.data.functions[k]?.name === resolvedName,
      );
      const entry = mapKey ? mapping.data.functions[mapKey] : undefined;
      if (entry) {
        bestMatch = { resolvedName, entry, confidence: 1.0 };
        break;
      }
    }
    if (bestMatch) matchedFunctions.set(funcKey, bestMatch);
    else unmatchedGroups.push(group);
  }

  log("info", `Fingerprint matched ${matchedFunctions.size} functions`);

  for (const [funcKey, match] of matchedFunctions) {
    const group = funcGroups.get(funcKey)!;
    resolved[funcKey] = claimName(funcKey, match.resolvedName);
    for (let i = 0; i < group.params.length; i++) {
      const storedName = match.entry.params[i];
      if (storedName)
        resolved[group.params[i]!.key] = claimName(
          group.params[i]!.key,
          storedName,
        );
    }
    for (let i = 0; i < group.locals.length; i++) {
      const storedName = match.entry.locals[i];
      if (storedName)
        resolved[group.locals[i]!.key] = claimName(
          group.locals[i]!.key,
          storedName,
        );
    }
    mapping.setFunction(funcKey, {
      ...match.entry,
      fingerprintHash: group.funcVar.fingerprintHash,
    });
  }
  mapping.save();

  if (llmConfig.enabled && unmatchedGroups.length > 0) {
    const llm = new LLMClient(llmConfig);
    const functions = extractFunctionsWithContext(code);
    const matchedKeys = new Set([...matchedFunctions.keys()]);
    const unmatchedFns = functions.filter((f) => {
      const key = `${f.scope}::${f.originalName}`;
      return funcGroups.has(key) && !matchedKeys.has(key);
    });

    log(
      "info",
      `Querying LLM for ${unmatchedFns.length} unmatched functions (batched, concurrency: ${llmConfig.concurrency})`,
    );

    const BATCH_SIZE = 5;
    const batches: (typeof unmatchedFns)[] = [];
    for (let i = 0; i < unmatchedFns.length; i += BATCH_SIZE) {
      batches.push(unmatchedFns.slice(i, i + BATCH_SIZE));
    }

    let saveChain: Promise<void> = Promise.resolve();
    const saveAfterBatch = () => {
      saveChain = saveChain.then(() => mapping.save());
    };

    const processBatch = async (
      batch: (typeof unmatchedFns)[0][],
      mappings: Record<string, string>[],
    ) => {
      for (let bi = 0; bi < batch.length; bi++) {
        const f = batch[bi]!;
        const suggested = mappings[bi] ?? {};
        const funcKey = `${f.scope}::${f.originalName}`;
        const group = funcGroups.get(funcKey);
        if (!group || resolved[funcKey]) continue;

        const funcNewName = suggested[f.originalName];
        if (!funcNewName) continue;

        const funcResolvedName = claimName(funcKey, funcNewName);
        resolved[funcKey] = funcResolvedName;

        const paramNames: string[] = [];
        const localNames: string[] = [];

        for (const [obfName, newName] of Object.entries(suggested)) {
          if (obfName === f.originalName) continue;
          const paramIdx = group.params.findIndex(
            (p) => p.originalName === obfName,
          );
          if (paramIdx >= 0) {
            paramNames[paramIdx] = newName;
            resolved[group.params[paramIdx]!.key] = claimName(
              group.params[paramIdx]!.key,
              newName,
            );
            continue;
          }
          const localIdx = group.locals.findIndex(
            (l) => l.originalName === obfName,
          );
          if (localIdx >= 0) {
            localNames[localIdx] = newName;
            resolved[group.locals[localIdx]!.key] = claimName(
              group.locals[localIdx]!.key,
              newName,
            );
          }
        }

        mapping.setFunction(funcKey, {
          name: funcResolvedName,
          module: "",
          fingerprintHash: group.funcVar.fingerprintHash,
          params: paramNames,
          locals: localNames,
        });
        log("info", `  LLM renamed ${f.originalName} -> ${funcResolvedName}`);
      }
      saveAfterBatch();
    };

    await batchConcurrent(
      batches,
      async (batch) => {
        const fnInputs = batch.map((f) => ({
          code: f.code,
          name: f.originalName,
        }));
        const mappings = await llm.renameFunctionBatch(fnInputs);
        await processBatch(batch, mappings);
      },
      llmConfig.concurrency,
    );
    await saveChain;
  }

  for (const [funcKey, group] of funcGroups) {
    if (resolved[funcKey] || !group.funcVar) continue;
    const existing = mapping.data.functions[funcKey];
    if (existing?.name && !isAutoName(existing.name)) {
      resolved[funcKey] = claimName(funcKey, existing.name);
      continue;
    }
    const name = makeAutoName(group.funcVar, autoNames);
    resolved[funcKey] = name;
    mapping.setFunction(funcKey, {
      name,
      module: "",
      fingerprintHash: group.funcVar.fingerprintHash,
      params: [],
      locals: [],
    });
  }
  mapping.save();

  // Phase 1: Reuse existing LLM/cached variable names from the mapping.
  // Strip any old auto-name entries so Phase 2 can re-attempt them.
  for (const v of variables) {
    const key = v.key;
    const existing = mapping.data.variables[key];
    if (
      existing?.name &&
      (isAutoName(existing.name) || /^_0x/.test(existing.name))
    ) {
      delete mapping.data.variables[key];
    }
  }
  mapping.save();

  for (const v of variables) {
    if (resolved[v.key]) continue;
    if (v.type === "function_declaration" || v.type === "function_variable")
      continue;

    const existingVar = mapping.data.variables[v.key];
    if (
      existingVar?.name &&
      !isAutoName(existingVar.name) &&
      !/^_0x/.test(existingVar.name)
    ) {
      resolved[v.key] = claimName(v.key, existingVar.name);
    }
  }
  mapping.save();

  // Phase 2: LLM names anything still unresolved (uses declaration + usages).
  if (llmConfig.enabled) {
    const llm = new LLMClient(llmConfig);
    const unnamedVars = variables.filter(
      (v) =>
        !resolved[v.key] &&
        isObfuscated(v.originalName) &&
        v.type !== "function_declaration" &&
        v.type !== "function_variable",
    );

    if (unnamedVars.length > 0) {
      log(
        "info",
        `Context-renaming ${unnamedVars.length} variables via LLM (per-scope)`,
      );
      const varNames = unnamedVars.map((v) => v.originalName);
      const usages = extractVarUsages(code, varNames);

      const groupByScope = new Map<string, typeof unnamedVars>();
      for (const v of unnamedVars) {
        if (!groupByScope.has(v.scope)) groupByScope.set(v.scope, []);
        groupByScope.get(v.scope)!.push(v);
      }

      const PER_BATCH = 12;
      const batchesByScope: (typeof unnamedVars)[] = [];
      for (const groupVars of groupByScope.values()) {
        for (let i = 0; i < groupVars.length; i += PER_BATCH) {
          batchesByScope.push(groupVars.slice(i, i + PER_BATCH));
        }
      }

      const newMappings: Record<string, string> = {};
      await batchConcurrent(
        batchesByScope,
        async (batch) => {
          const inputs = batch.map((v) => ({
            name: v.originalName,
            declaration:
              v.code && v.code.length > 200
                ? v.code.slice(0, 200) + "..."
                : v.code || `var ${v.originalName};`,
            usages: (usages.get(v.originalName) ?? []).slice(0, 4),
          }));
          const suggested = await llm.renameVarBatchWithContext(inputs);
          for (const [obf, newName] of Object.entries(suggested)) {
            if (isAutoName(newName)) continue;
            if (obf === newName) continue;
            newMappings[obf] = newName;
          }
        },
        llmConfig.concurrency,
      );

      for (const v of unnamedVars) {
        const newName = newMappings[v.originalName];
        if (newName) {
          resolved[v.key] = claimName(v.key, newName);
          mapping.data.variables[v.key] = {
            name: resolved[v.key]!,
            module: mapping.data.variables[v.key]?.module ?? "core",
          };
        } else {
          log(
            "warn",
            `LLM returned no usable name for ${v.originalName} (key: ${v.key}), will auto-name`,
          );
        }
      }
      mapping.save();
    }
  }

  // Phase 3: Auto-name fallback (LLM disabled or returned nothing usable).
  for (const v of variables) {
    if (resolved[v.key]) continue;
    if (v.type === "function_declaration" || v.type === "function_variable")
      continue;

    const existingVar = mapping.data.variables[v.key];
    if (
      existingVar?.name &&
      !isAutoName(existingVar.name) &&
      !/^_0x/.test(existingVar.name)
    ) {
      resolved[v.key] = claimName(v.key, existingVar.name);
      continue;
    }

    const name = makeAutoName(v, autoNames);
    if (!resolved[v.key]) {
      resolved[v.key] = name;
      mapping.data.variables[v.key] = {
        name,
        module: "core",
      };
    }
  }
  mapping.save();

  return { resolved };
}
