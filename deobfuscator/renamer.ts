import {
  extractFunctionsWithContext,
  extractVarUsages,
  groupVariablesByFunction,
  isObfuscated,
  computeVariableRoleFingerprint,
  computeSimilarity,
  computeFunctionDNA,
  isReservedWord,
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

  // Use fingerprint hash as seed for stability across versions.
  // Falls back to key hash if fingerprint is unavailable.
  const seed = v.fingerprintHash || v.key || `${v.scope}::${v.originalName}`;
  const base = Math.abs(hashStr(seed)) % 65536;
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

  // Track the original base name for each variable so we can store clean
  // names in the mapping (without prefixes/suffixes) and prevent prefix
  // accumulation across versions.
  const baseNameMap = new Map<string, string>();

  // Strip known prefixes that were added by previous claimName calls.
  // This prevents prefix accumulation across versions.
  const KNOWN_PREFIXES = [
    "bool",
    "arr",
    "obj",
    "str",
    "num",
    "fn",
    "ui",
    "core",
    "global",
    "main",
    "app",
    "sys",
    "mod",
  ];

  function stripPrefixes(name: string): string {
    let result = name;
    let changed = true;
    while (changed) {
      changed = false;
      for (const prefix of KNOWN_PREFIXES) {
        if (
          result.length > prefix.length &&
          result.toLowerCase().startsWith(prefix.toLowerCase()) &&
          /[A-Z]/.test(result[prefix.length]!)
        ) {
          result = result.slice(prefix.length);
          changed = true;
          break;
        }
      }
      if (!changed) {
        const hexMatch = result.match(/^[a-f0-9]+[A-Z]/);
        if (hexMatch) {
          result = result.slice(hexMatch[0].length - 1);
          changed = true;
        }
      }
    }
    return result;
  }

  function getScopeFromKey(key: string): string {
    const idx = key.indexOf("::");
    return idx >= 0 ? key.slice(0, idx) : "global";
  }

  // Build a lookup map for variable info so claimName can use contextual prefixes.
  const varInfoByKey = new Map<string, VariableInfo>();
  for (const v of variables) {
    varInfoByKey.set(v.key, v);
  }

  function claimName(
    key: string,
    name: string,
    varInfo?: VariableInfo,
  ): string {
    const scope = getScopeFromKey(key);
    const isGlobal = scope === "global";
    // Strip any existing suffix chains (numeric or alphanumeric) before claiming
    const stripped = name.replace(/(?:_[a-zA-Z0-9]{1,4})+$/, "");
    // Also strip any accumulated prefixes from previous versions
    const baseName = stripPrefixes(stripped);
    // Remember the base name for storing in the mapping later
    baseNameMap.set(key, baseName);

    // Build a human-readable prefix based on the variable's context.
    // For scoped variables, use the parent function's resolved name.
    // For global variables, use the variable's own type/init pattern.
    function getContextPrefix(depth: number = 0): string | undefined {
      if (isGlobal) {
        const info = varInfo || varInfoByKey.get(key);
        if (info) {
          if (depth === 0) {
            const init = info.initType?.toLowerCase() || "";
            if (init.includes("boolean") || init.includes("bool"))
              return "bool";
            if (init.includes("array") || init.includes("arr")) return "arr";
            if (init.includes("object") || init.includes("obj")) return "obj";
            if (init.includes("string") || init.includes("str")) return "str";
            if (init.includes("number") || init.includes("num")) return "num";
            if (init.includes("function") || init.includes("fn")) return "fn";
          }
          if (depth <= 1) {
            const scopeLower = info.scope.toLowerCase();
            if (scopeLower.includes("ui") || scopeLower.includes("dom"))
              return "ui";
            if (scopeLower.includes("core")) return "core";
          }
        }
        return undefined;
      }
      // Scoped variable: look up parent function's resolved name
      const funcName = baseNameMap.get(scope) || resolved[scope];
      if (funcName && !isAutoName(funcName)) {
        return funcName;
      }
      return undefined;
    }

    function tryClaim(
      targetName: string,
      nameSet: Set<string>,
    ): string | undefined {
      if (nameSet.has(targetName)) return undefined;
      nameSet.add(targetName);
      return targetName;
    }

    if (isGlobal) {
      // Try base name first
      let result = tryClaim(baseName, usedGlobalNames);
      if (result) return result;

      // Try with type prefix
      for (let depth = 0; depth < 2; depth++) {
        const prefix = getContextPrefix(depth);
        if (prefix) {
          const disambiguated = `${prefix}${baseName[0]!.toUpperCase() + baseName.slice(1)}`;
          result = tryClaim(disambiguated, usedGlobalNames);
          if (result) return result;
        }
      }

      // Final fallback: use a generic category prefix based on the key hash
      // This ensures we NEVER append suffixes
      const categories = ["global", "main", "app", "sys", "mod"];
      const hash = Math.abs(hashStr(key)) % categories.length;
      const fallback = `${categories[hash]!}${baseName[0]!.toUpperCase() + baseName.slice(1)}`;
      result = tryClaim(fallback, usedGlobalNames);
      if (result) {
        log(
          "warn",
          `Global name collision: ${baseName} already used, using ${fallback} for ${key}`,
        );
        return result;
      }
      // Should never reach here, but just in case
      return baseName;
    }

    if (!scopedNames.has(scope)) scopedNames.set(scope, new Set());
    const names = scopedNames.get(scope)!;

    // Check against usedGlobalNames too, since obfuscated code often
    // hoists all declarations to the module level.
    function tryClaimScoped(targetName: string): string | undefined {
      if (usedGlobalNames.has(targetName) || names.has(targetName)) {
        return undefined;
      }
      usedGlobalNames.add(targetName);
      names.add(targetName);
      return targetName;
    }

    // Try base name first
    let result = tryClaimScoped(baseName);
    if (result) return result;

    // Try with function name prefix
    const prefix = getContextPrefix();
    if (prefix) {
      const disambiguated = `${prefix}${baseName[0]!.toUpperCase() + baseName.slice(1)}`;
      result = tryClaimScoped(disambiguated);
      if (result) return result;
    }

    // Final fallback: use the variable's original obfuscated name as a prefix.
    // Ensure the prefix does NOT start with a number (invalid JS identifier).
    const obfPrefix = varInfo?.originalName || key.split("::").pop() || "var";
    let cleanPrefix = obfPrefix.replace(/^_0x/, "").slice(0, 4);
    if (/^\d/.test(cleanPrefix)) {
      cleanPrefix = "v" + cleanPrefix;
    }
    const fallback = `${cleanPrefix}${baseName[0]!.toUpperCase() + baseName.slice(1)}`;
    result = tryClaimScoped(fallback);
    if (result) {
      log(
        "warn",
        `Scoped name collision in ${scope}: ${baseName} already used, using ${fallback} for ${key}`,
      );
      return result;
    }
    return baseName;
  }

  const fpIndex = mapping.getFunctionFingerprintIndex();
  const matchedFunctions = new Map<
    string,
    { resolvedName: string; entry: FunctionMappingEntry; confidence: number }
  >();
  const unmatchedGroups: FunctionGroup[] = [];

  const SIMILARITY_THRESHOLD = 0.85;

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

    // Phase 0: Try exact DNA matching (most stable across versions)
    const dna = computeFunctionDNA(group.funcVar.fingerprint);
    const dnaMatch = mapping.getFunctionByDNA(dna);
    if (dnaMatch) {
      const mapKey = Object.keys(mapping.data.functions).find(
        (k) => mapping.data.functions[k]?.name === dnaMatch,
      );
      const entry = mapKey ? mapping.data.functions[mapKey] : undefined;
      if (entry) {
        matchedFunctions.set(funcKey, {
          resolvedName: dnaMatch,
          entry,
          confidence: 1.0,
        });
        log("info", `  DNA-matched ${funcKey} -> ${dnaMatch}`);
        continue;
      }
    }

    let bestMatch: {
      resolvedName: string;
      entry: FunctionMappingEntry;
      confidence: number;
    } | null = null;
    for (const [resolvedName, fpEntry] of Object.entries(fpIndex)) {
      if (!fpEntry.fingerprintHash) continue;

      // Try exact hash match first
      if (fpEntry.fingerprintHash === group.funcVar.fingerprintHash) {
        const mapKey = Object.keys(mapping.data.functions).find(
          (k) => mapping.data.functions[k]?.name === resolvedName,
        );
        const entry = mapKey ? mapping.data.functions[mapKey] : undefined;
        if (entry) {
          bestMatch = { resolvedName, entry, confidence: 1.0 };
          break;
        }
      }

      // Fall back to fuzzy similarity match
      const similarity = computeSimilarity(
        group.funcVar.fingerprint,
        fpEntry.fingerprint,
      );
      if (
        similarity >= SIMILARITY_THRESHOLD &&
        similarity > (bestMatch?.confidence ?? 0)
      ) {
        const mapKey = Object.keys(mapping.data.functions).find(
          (k) => mapping.data.functions[k]?.name === resolvedName,
        );
        const entry = mapKey ? mapping.data.functions[mapKey] : undefined;
        if (entry) {
          bestMatch = { resolvedName, entry, confidence: similarity };
        }
      }
    }
    if (bestMatch) {
      matchedFunctions.set(funcKey, bestMatch);
      continue;
    }

    // Phase 0.5: Multi-signal fallback matching when overall fingerprint
    // similarity is below threshold. Uses individual stable signals:
    // param count, called functions, property accesses, string literals.
    let multiSignalBest: {
      resolvedName: string;
      entry: FunctionMappingEntry;
      score: number;
    } | null = null;
    for (const [resolvedName, fpEntry] of Object.entries(fpIndex)) {
      if (!fpEntry.fingerprintHash) continue;

      let signals = 0;
      let totalSignals = 0;

      // Signal 1: param count (very stable)
      totalSignals++;
      if (
        (group.funcVar.fingerprint.paramCount ?? 0) ===
        (fpEntry.fingerprint.paramCount ?? 0)
      )
        signals++;

      // Signal 2: called functions overlap
      totalSignals++;
      const curCalls = new Set(group.funcVar.fingerprint.calledFunctions ?? []);
      const fpCalls = new Set(fpEntry.fingerprint.calledFunctions ?? []);
      const callIntersection = [...curCalls].filter((c) =>
        fpCalls.has(c),
      ).length;
      const callUnion = new Set([...curCalls, ...fpCalls]).size;
      if (callUnion > 0 && callIntersection / callUnion >= 0.5) signals++;

      // Signal 3: property accesses overlap
      totalSignals++;
      const curProps = new Set(
        group.funcVar.fingerprint.propertyAccesses ?? [],
      );
      const fpProps = new Set(fpEntry.fingerprint.propertyAccesses ?? []);
      const propIntersection = [...curProps].filter((p) =>
        fpProps.has(p),
      ).length;
      const propUnion = new Set([...curProps, ...fpProps]).size;
      if (propUnion > 0 && propIntersection / propUnion >= 0.4) signals++;

      // Signal 4: string literals overlap
      totalSignals++;
      const curStrs = new Set(group.funcVar.fingerprint.stringLiterals ?? []);
      const fpStrs = new Set(fpEntry.fingerprint.stringLiterals ?? []);
      const strIntersection = [...curStrs].filter((s) => fpStrs.has(s)).length;
      const strUnion = new Set([...curStrs, ...fpStrs]).size;
      if (strUnion > 0 && strIntersection / strUnion >= 0.4) signals++;

      // Signal 5: hasLoops / hasConditionals / hasTryCatch pattern
      totalSignals++;
      const patternSignals = [
        "hasLoops",
        "hasConditionals",
        "hasTryCatch",
      ] as const;
      let patternMatches = 0;
      for (const p of patternSignals) {
        if (
          (group.funcVar.fingerprint[p] ?? false) ===
          (fpEntry.fingerprint[p] ?? false)
        )
          patternMatches++;
      }
      if (patternMatches >= 2) signals++;

      const score = totalSignals > 0 ? signals / totalSignals : 0;
      if (score >= 0.6 && score > (multiSignalBest?.score ?? 0)) {
        const mapKey = Object.keys(mapping.data.functions).find(
          (k) => mapping.data.functions[k]?.name === resolvedName,
        );
        const entry = mapKey ? mapping.data.functions[mapKey] : undefined;
        if (entry) {
          multiSignalBest = { resolvedName, entry, score };
        }
      }
    }
    if (multiSignalBest) {
      log(
        "info",
        `  Multi-signal matched ${funcKey} -> ${multiSignalBest.resolvedName} (score: ${multiSignalBest.score.toFixed(2)})`,
      );
      matchedFunctions.set(funcKey, {
        resolvedName: multiSignalBest.resolvedName,
        entry: multiSignalBest.entry,
        confidence: multiSignalBest.score,
      });
    } else {
      unmatchedGroups.push(group);
    }
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
          group.params[i],
        );
    }
    for (let i = 0; i < group.locals.length; i++) {
      const storedName = match.entry.locals[i];
      if (storedName)
        resolved[group.locals[i]!.key] = claimName(
          group.locals[i]!.key,
          storedName,
          group.locals[i],
        );
    }
    mapping.setFunction(funcKey, {
      ...match.entry,
      fingerprintHash: group.funcVar.fingerprintHash,
    });
    // Persist DNA for exact matching in future versions
    const dna = computeFunctionDNA(group.funcVar.fingerprint);
    mapping.setFunctionDNA(dna, match.resolvedName);
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

        // Canonicalize: if a semantically similar name exists, reuse it
        const canonicalName = mapping.canonicalize
          ? mapping.canonicalize(funcNewName)
          : funcNewName;
        const funcResolvedName = claimName(funcKey, canonicalName);
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
              group.params[paramIdx],
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
              group.locals[localIdx],
            );
          }
        }

        mapping.setFunction(funcKey, {
          name: funcResolvedName,
          module: "",
          fingerprintHash: group.funcVar.fingerprintHash,
          fingerprint: group.funcVar.fingerprint,
          params: paramNames,
          locals: localNames,
        });
        // Persist DNA for exact matching in future versions
        const dna = computeFunctionDNA(group.funcVar.fingerprint);
        mapping.setFunctionDNA(dna, funcResolvedName);
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
      fingerprint: group.funcVar.fingerprint,
      params: [],
      locals: [],
    });
  }
  mapping.save();

  // Phase 0.5: Match module-level variables by structural role fingerprint.
  const moduleLevelVars = variables.filter(
    (v) =>
      !resolved[v.key] &&
      v.scope === "global" &&
      v.type !== "function_declaration" &&
      v.type !== "function_variable",
  );
  for (const v of moduleLevelVars) {
    const matchedName = tryMatchVariableByFingerprint(v, code, "module");
    if (matchedName) {
      resolved[v.key] = claimName(v.key, matchedName, v);
    }
  }
  mapping.save();

  // Variable role fingerprint matching: identify semantically equivalent
  // variables across versions by their structural usage patterns.
  function tryMatchVariableByFingerprint(
    varInfo: VariableInfo,
    funcCode: string,
    funcFingerprintHash: string,
  ): string | undefined {
    try {
      const roleFp = computeVariableRoleFingerprint(
        funcCode,
        varInfo.originalName,
      );
      const existing = mapping.getVariableByRoleFingerprint(
        funcFingerprintHash,
        roleFp,
      );
      if (existing) {
        // Strip any accumulated suffix so claimName handles dedup cleanly
        const cleanName = existing.name.replace(/(?:_[a-zA-Z0-9]{1,4})+$/, "");
        log(
          "info",
          `  Role-fingerprint matched ${varInfo.originalName} -> ${cleanName}`,
        );
        return cleanName;
      }
    } catch (e) {
      log(
        "warn",
        `  Failed to compute role fingerprint: ${(e as Error).message}`,
      );
    }
    return undefined;
  }

  // Phase 0: Match variables by structural role fingerprint before
  // falling back to cached names or LLM.
  for (const [funcKey, group] of funcGroups) {
    const funcVar = group.funcVar;
    if (!funcVar?.fingerprintHash) continue;

    // Find the function code for fingerprinting
    const funcCode = funcVar.code || "";

    for (const param of group.params) {
      if (resolved[param.key]) continue;
      const matchedName = tryMatchVariableByFingerprint(
        param,
        funcCode,
        funcVar.fingerprintHash,
      );
      if (matchedName) {
        resolved[param.key] = claimName(param.key, matchedName, param);
      }
    }

    for (const local of group.locals) {
      if (resolved[local.key]) continue;
      const matchedName = tryMatchVariableByFingerprint(
        local,
        funcCode,
        funcVar.fingerprintHash,
      );
      if (matchedName) {
        resolved[local.key] = claimName(local.key, matchedName, local);
      }
    }
  }

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
      resolved[v.key] = claimName(v.key, existingVar.name, v);
    }
  }
  mapping.save();

  // Phase 1.5: Broad cross-version role fingerprint matching.
  // Before falling back to LLM, search ALL stored fingerprints with a
  // relaxed threshold to catch variables whose role changed slightly.
  for (const v of variables) {
    if (resolved[v.key]) continue;
    if (v.type === "function_declaration" || v.type === "function_variable")
      continue;

    try {
      const roleFp = computeVariableRoleFingerprint(code, v.originalName);
      const broadMatch = mapping.findVariableByRoleFingerprintBroad(roleFp);
      if (broadMatch) {
        const cleanName = broadMatch.name.replace(
          /(?:_[a-zA-Z0-9]{1,4})+$/,
          "",
        );
        log(
          "info",
          `  Broad role-fingerprint matched ${v.originalName} -> ${cleanName}`,
        );
        resolved[v.key] = claimName(v.key, cleanName, v);
        mapping.data.variables[v.key] = {
          name: resolved[v.key]!,
          module: mapping.data.variables[v.key]?.module ?? "core",
        };
      }
    } catch (e) {
      log(
        "warn",
        `  Failed to compute role fingerprint for broad match: ${(e as Error).message}`,
      );
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
          // Collect already-used names in this scope to avoid duplicates
          const scope = batch[0]?.scope ?? "global";
          const alreadyUsed = scopedNames.has(scope)
            ? [...scopedNames.get(scope)!]
            : [];
          const suggested = await llm.renameVarBatchWithContext(
            inputs,
            alreadyUsed,
          );
          for (const [obf, newName] of Object.entries(suggested)) {
            if (isAutoName(newName)) continue;
            if (obf === newName) continue;
            newMappings[obf] = newName;
          }
        },
        llmConfig.concurrency,
      );

      // Post-LLM: detect and resolve duplicate names within the same scope.
      // Build scope -> proposedName -> variable[] map.
      const scopeNameMap = new Map<string, Map<string, typeof unnamedVars>>();
      for (const v of unnamedVars) {
        const newName = newMappings[v.originalName];
        if (!newName) continue;
        if (!scopeNameMap.has(v.scope)) scopeNameMap.set(v.scope, new Map());
        const nameMap = scopeNameMap.get(v.scope)!;
        if (!nameMap.has(newName)) nameMap.set(newName, []);
        nameMap.get(newName)!.push(v);
      }
      for (const [scope, nameMap] of scopeNameMap) {
        for (const [newName, vars] of nameMap) {
          if (vars.length <= 1) continue;
          log(
            "warn",
            `Duplicate LLM name "${newName}" in scope ${scope} for ${vars.length} variables: ${vars.map((v) => v.originalName).join(", ")}`,
          );
          // Keep the first variable with the original name, disambiguate the rest.
          for (let i = 1; i < vars.length; i++) {
            const v = vars[i]!;
            const suffix = Math.abs(hashStr(v.key)).toString(36).slice(0, 3);
            const disambiguated = `${newName}_${suffix}`;
            log(
              "warn",
              `  Disambiguated ${v.originalName} -> ${disambiguated}`,
            );
            newMappings[v.originalName] = disambiguated;
          }
        }
      }

      for (const v of unnamedVars) {
        const newName = newMappings[v.originalName];
        if (newName) {
          // Canonicalize: merge semantically similar names
          const canonicalName = mapping.canonicalize
            ? mapping.canonicalize(newName)
            : newName;
          resolved[v.key] = claimName(v.key, canonicalName, v);
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
      resolved[v.key] = claimName(v.key, existingVar.name, v);
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

  // Save role fingerprints for all resolved variables so future
  // versions can match them structurally.
  for (const [funcKey, group] of funcGroups) {
    const funcVar = group.funcVar;
    if (!funcVar?.fingerprintHash) continue;
    const funcCode = funcVar.code || "";

    for (const param of group.params) {
      if (!resolved[param.key]) continue;
      try {
        const roleFp = computeVariableRoleFingerprint(
          funcCode,
          param.originalName,
        );
        mapping.setVariableRoleFingerprint(
          funcVar.fingerprintHash,
          roleFp.hash,
          {
            name: resolved[param.key]!,
            module: mapping.data.variables[param.key]?.module ?? "core",
            roleFingerprint: roleFp,
          },
        );
      } catch {
        /* ignore fingerprint computation errors */
      }
    }

    for (const local of group.locals) {
      if (!resolved[local.key]) continue;
      try {
        const roleFp = computeVariableRoleFingerprint(
          funcCode,
          local.originalName,
        );
        mapping.setVariableRoleFingerprint(
          funcVar.fingerprintHash,
          roleFp.hash,
          {
            name: resolved[local.key]!,
            module: mapping.data.variables[local.key]?.module ?? "core",
            roleFingerprint: roleFp,
          },
        );
      } catch {
        /* ignore fingerprint computation errors */
      }
    }
  }
  // Save role fingerprints for module-level variables so future
  // versions can match them structurally.
  const moduleLevelVarsToPersist = variables.filter(
    (v) =>
      v.scope === "global" &&
      v.type !== "function_declaration" &&
      v.type !== "function_variable",
  );
  for (const v of moduleLevelVarsToPersist) {
    if (!resolved[v.key]) continue;
    try {
      const roleFp = computeVariableRoleFingerprint(code, v.originalName);
      mapping.setVariableRoleFingerprint("module", roleFp.hash, {
        name: resolved[v.key]!,
        module: mapping.data.variables[v.key]?.module ?? "core",
        roleFingerprint: roleFp,
      });
    } catch {
      /* ignore fingerprint computation errors */
    }
  }
  // Post-processing: detect and fix any duplicate names globally.
  // This is a safety net for edge cases where claimName didn't catch a collision.
  // Obfuscated code often hoists all declarations to the module level, so
  // variables from different scopes can end up in the same namespace.
  const nameToKeys = new Map<string, string[]>();
  for (const [key, name] of Object.entries(resolved)) {
    if (!nameToKeys.has(name)) nameToKeys.set(name, []);
    nameToKeys.get(name)!.push(key);
  }
  for (const [name, keys] of nameToKeys) {
    if (keys.length <= 1) continue;
    log(
      "warn",
      `Duplicate name "${name}" for ${keys.length} variables: ${keys.join(", ")}`,
    );
    for (let i = 1; i < keys.length; i++) {
      const key = keys[i]!;
      const obfName = key.split("::").pop() || "var";
      const prefix = obfName.replace(/^_0x/, "").slice(0, 4);
      const safePrefix = /^\d/.test(prefix) ? `v${prefix}` : prefix;
      const newName = `${safePrefix}${name[0]!.toUpperCase() + name.slice(1)}`;
      log("warn", `  Renamed ${key} -> ${newName}`);
      resolved[key] = newName;
    }
  }

  // Filter out any mappings that would rename to a reserved word
  for (const [key, name] of Object.entries(resolved)) {
    if (isReservedWord(name)) {
      log("warn", `Filtering out reserved word rename: ${key} -> ${name}`);
      delete resolved[key];
    }
  }

  mapping.save();

  return { resolved };
}
