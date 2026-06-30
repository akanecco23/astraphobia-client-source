import type {
  MappingFile,
  FunctionMappingEntry,
  VariableRoleFingerprint,
  VariableMappingEntry,
  FunctionDNA,
} from "./types.js";
import {
  computeSimilarity,
  computeFunctionDNA,
  isReservedWord,
} from "./ast-utils.js";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import type { Fingerprint } from "./types.js";
import { resolve } from "path";

const SUFFIX_RE = /(?:_\d+)+$/;

function stripNameSuffix(name: string): string {
  return name.replace(SUFFIX_RE, "");
}

export class MappingStore {
  filePath: string;
  data: MappingFile;

  constructor(filePath: string) {
    this.filePath = resolve(filePath);
    const dir = resolve(this.filePath, "..");
    mkdirSync(dir, { recursive: true });
    this.data = this._load();
  }

  _load(): MappingFile {
    if (existsSync(this.filePath)) {
      try {
        const raw = JSON.parse(readFileSync(this.filePath, "utf-8"));
        if (raw._meta && (raw.functions || raw.variables)) {
          // Filter out any entries with reserved word names
          for (const [key, entry] of Object.entries(raw.functions || {})) {
            if (
              entry &&
              typeof entry === "object" &&
              "name" in entry &&
              isReservedWord((entry as any).name)
            ) {
              delete (raw.functions as any)[key];
            }
          }
          for (const [key, entry] of Object.entries(raw.variables || {})) {
            if (
              entry &&
              typeof entry === "object" &&
              "name" in entry &&
              isReservedWord((entry as any).name)
            ) {
              delete (raw.variables as any)[key];
            }
          }
          return raw as MappingFile;
        }
      } catch {
        /* */
      }
    }
    return {
      _meta: {
        version: null,
        lastUpdated: null,
        description:
          "Edit name/module fields to customize. Params/locals are ordered by position.",
      },
      functions: {},
      variables: {},
      variableFingerprints: {},
      functionDNAIndex: {},
      canonicalNames: {},
    };
  }

  save(): void {
    this.data._meta.lastUpdated = new Date().toISOString();
    writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), "utf-8");
  }

  getFunctionFingerprintIndex(): Record<
    string,
    {
      name: string;
      fingerprintHash: string;
      fingerprint: import("./types.js").Fingerprint;
      params: string[];
      locals: string[];
      module: string;
    }
  > {
    const result: Record<
      string,
      {
        name: string;
        fingerprintHash: string;
        fingerprint: import("./types.js").Fingerprint;
        params: string[];
        locals: string[];
        module: string;
      }
    > = {};
    for (const [, entry] of Object.entries(this.data.functions)) {
      if (entry.fingerprintHash) {
        result[entry.name] = {
          name: entry.name,
          fingerprintHash: entry.fingerprintHash,
          fingerprint: entry.fingerprint || {},
          params: entry.params,
          locals: entry.locals,
          module: entry.module,
        };
      }
    }
    return result;
  }

  setFunction(scopeKey: string, entry: FunctionMappingEntry): void {
    this.data.functions[scopeKey] = entry;
  }

  getModuleAssignments(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [scopeKey, entry] of Object.entries(this.data.functions)) {
      result[scopeKey] = entry.module;
    }
    for (const [scopeKey, entry] of Object.entries(this.data.variables)) {
      result[scopeKey] = entry.module;
    }
    return result;
  }

  // Variable fingerprint methods
  getVariableByRoleFingerprint(
    funcFingerprintHash: string,
    roleFingerprint: VariableRoleFingerprint,
  ): VariableMappingEntry | undefined {
    const key = `${funcFingerprintHash}::${roleFingerprint.hash}`;
    const exact = this.data.variableFingerprints?.[key];
    if (exact) return exact;

    // Fallback: try fuzzy similarity matching
    return this.findVariableByRoleFingerprintSimilarity(
      funcFingerprintHash,
      roleFingerprint,
    );
  }

  private computeJaccardSimilarity(a: string[], b: string[]): number {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  private computeRoleFingerprintSimilarity(
    a: VariableRoleFingerprint,
    b: VariableRoleFingerprint,
    context: "module" | "function" = "function",
  ): number {
    // Weighted similarity across different aspects of the fingerprint.
    // Module-level variables get higher weight on initPattern (most stable
    // across versions) because usage sites drift more than initialization.
    const isModule = context === "module";
    const initWeight = isModule ? 0.45 : 0.15;
    const propsWeight = isModule ? 0.25 : 0.35;
    const methodsWeight = isModule ? 0.15 : 0.2;
    const comparisonsWeight = 0.05;
    const assignmentsWeight = 0.1;

    const initSim =
      a.initPattern === null && b.initPattern === null
        ? 1
        : a.initPattern === null || b.initPattern === null
          ? 0
          : a.initPattern === b.initPattern
            ? 1
            : 0;

    const propsSim = this.computeJaccardSimilarity(
      a.propertyAccesses,
      b.propertyAccesses,
    );
    const methodsSim = this.computeJaccardSimilarity(
      a.methodCalls,
      b.methodCalls,
    );
    const comparisonsSim = this.computeJaccardSimilarity(
      a.comparisonTargets,
      b.comparisonTargets,
    );
    const assignmentsSim = this.computeJaccardSimilarity(
      a.assignmentTargets,
      b.assignmentTargets,
    );

    return (
      initSim * initWeight +
      propsSim * propsWeight +
      methodsSim * methodsWeight +
      comparisonsSim * comparisonsWeight +
      assignmentsSim * assignmentsWeight
    );
  }

  private findVariableByRoleFingerprintSimilarity(
    funcFingerprintHash: string,
    roleFingerprint: VariableRoleFingerprint,
  ): VariableMappingEntry | undefined {
    if (!this.data.variableFingerprints) return undefined;

    const prefix = `${funcFingerprintHash}::`;
    let bestMatch: { entry: VariableMappingEntry; similarity: number } | null =
      null;
    const isModule = funcFingerprintHash === "module";
    const SIMILARITY_THRESHOLD = isModule ? 0.45 : 0.55;

    // Phase 1: Search under the specific function hash (same-function match)
    for (const [key, entry] of Object.entries(
      this.data.variableFingerprints as Record<string, VariableMappingEntry>,
    )) {
      if (!key.startsWith(prefix)) continue;
      if (!entry.roleFingerprint) continue;

      const similarity = this.computeRoleFingerprintSimilarity(
        roleFingerprint,
        entry.roleFingerprint,
        isModule ? "module" : "function",
      );

      if (similarity >= SIMILARITY_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity };
        }
      }
    }

    if (bestMatch) return bestMatch.entry;

    // Phase 2: Cross-hash fallback — search ALL entries regardless of
    // function hash. This handles cases where the parent function's
    // fingerprint changed between versions (e.g., a loop was added)
    // but the variable's role remained the same.
    // Uses a higher threshold to avoid false matches across functions.
    const CROSS_THRESHOLD = isModule ? 0.5 : 0.65;
    for (const [key, entry] of Object.entries(
      this.data.variableFingerprints as Record<string, VariableMappingEntry>,
    )) {
      if (key.startsWith(prefix)) continue;
      if (!entry.roleFingerprint) continue;

      const similarity = this.computeRoleFingerprintSimilarity(
        roleFingerprint,
        entry.roleFingerprint,
        isModule ? "module" : "function",
      );

      if (similarity >= CROSS_THRESHOLD) {
        if (!bestMatch || similarity > bestMatch.similarity) {
          bestMatch = { entry, similarity };
        }
      }
    }

    return bestMatch?.entry;
  }

  setVariableRoleFingerprint(
    funcFingerprintHash: string,
    roleFingerprintHash: string,
    entry: VariableMappingEntry,
  ): void {
    if (!this.data.variableFingerprints) {
      this.data.variableFingerprints = {};
    }
    const key = `${funcFingerprintHash}::${roleFingerprintHash}`;
    // Strip any _N suffix so cross-version matching always gets the base name
    this.data.variableFingerprints[key] = {
      ...entry,
      name: stripNameSuffix(entry.name),
    };
  }

  // Function DNA exact matching
  getFunctionByDNA(dna: FunctionDNA): string | undefined {
    if (!this.data.functionDNAIndex) return undefined;
    // Try each DNA component in order of stability
    const hashes = [dna.stringDNA, dna.apiDNA, dna.propertyDNA, dna.callDNA];
    for (const hash of hashes) {
      if (hash && this.data.functionDNAIndex[hash]) {
        return this.data.functionDNAIndex[hash];
      }
    }
    return undefined;
  }

  setFunctionDNA(dna: FunctionDNA, name: string): void {
    if (!this.data.functionDNAIndex) {
      this.data.functionDNAIndex = {};
    }
    // Store under each non-empty DNA component
    const hashes = [dna.stringDNA, dna.apiDNA, dna.propertyDNA, dna.callDNA];
    for (const hash of hashes) {
      if (hash) {
        this.data.functionDNAIndex[hash] = name;
      }
    }
  }

  // Canonical name registry for semantic stability
  canonicalize(name: string): string {
    if (!this.data.canonicalNames) {
      this.data.canonicalNames = {};
    }
    // Normalize: lowercase, strip trailing numbers and underscores
    const normalized = name
      .toLowerCase()
      .replace(/[_\s]+/g, "_")
      .replace(/_?\d+$/, "");
    const existing = this.data.canonicalNames[normalized];
    if (existing) return existing;
    this.data.canonicalNames[normalized] = name;
    return name;
  }

  getCanonicalName(normalized: string): string | undefined {
    return this.data.canonicalNames?.[normalized];
  }

  // Post-processing: merge function entries that have identical DNA
  // but different names. This cleans up cases where the same function
  // across versions was independently named by the LLM.
  mergeDuplicateFunctions(): number {
    const dnaToNames = new Map<string, Map<string, number>>();
    const dnaToKeys = new Map<string, string[]>();

    for (const [key, entry] of Object.entries(this.data.functions)) {
      let dnaKey = "";

      if (entry.fingerprint) {
        const dna = computeFunctionDNA(entry.fingerprint);
        dnaKey = [dna.stringDNA, dna.apiDNA, dna.propertyDNA, dna.callDNA]
          .filter(Boolean)
          .join("::");
      } else if (entry.fingerprintHash) {
        dnaKey = `hash::${entry.fingerprintHash}`;
      }

      if (!dnaKey) continue;

      if (!dnaToNames.has(dnaKey)) dnaToNames.set(dnaKey, new Map());
      const nameCounts = dnaToNames.get(dnaKey)!;
      nameCounts.set(entry.name, (nameCounts.get(entry.name) || 0) + 1);

      if (!dnaToKeys.has(dnaKey)) dnaToKeys.set(dnaKey, []);
      dnaToKeys.get(dnaKey)!.push(key);
    }

    let merged = 0;
    for (const [dnaKey, nameCounts] of dnaToNames) {
      if (nameCounts.size <= 1) continue;

      const sorted = [...nameCounts.entries()].sort((a, b) => {
        const aSuffix = (a[0].match(/_(\d+)$/) || [])[1];
        const bSuffix = (b[0].match(/_(\d+)$/) || [])[1];
        const aHasSuffix = aSuffix !== undefined;
        const bHasSuffix = bSuffix !== undefined;
        if (aHasSuffix !== bHasSuffix) return aHasSuffix ? 1 : -1;
        if (a[0].length !== b[0].length) return a[0].length - b[0].length;
        return 0;
      });
      const bestName = sorted[0]![0];

      const keys = dnaToKeys.get(dnaKey)!;
      for (const key of keys) {
        const entry = this.data.functions[key];
        if (entry && entry.name !== bestName) {
          entry.name = bestName;
          merged++;
        }
      }

      // Update DNA index to point to the best name
      if (this.data.functionDNAIndex) {
        const hashes = dnaKey.split("::").filter(Boolean);
        for (const hash of hashes) {
          if (hash !== "hash") {
            this.data.functionDNAIndex[hash] = bestName;
          }
        }
      }
    }

    return merged;
  }

  // Post-processing: merge variable entries that have identical role
  // fingerprints but different names.
  mergeDuplicateVariables(): number {
    if (!this.data.variableFingerprints) return 0;

    // Group by funcFingerprintHash to only merge within same function
    const funcGroups = new Map<
      string,
      Map<string, { names: Map<string, number>; fpKeys: string[] }>
    >();

    for (const [fpKey, entry] of Object.entries(
      this.data.variableFingerprints as Record<string, VariableMappingEntry>,
    )) {
      if (!entry.roleFingerprint) continue;
      const roleHash = entry.roleFingerprint.hash;
      if (!roleHash) continue;

      const funcHash = fpKey.split("::")[0] ?? "";
      if (!funcHash) continue;

      if (!funcGroups.has(funcHash)) funcGroups.set(funcHash, new Map());
      const roleMap = funcGroups.get(funcHash)!;

      if (!roleMap.has(roleHash))
        roleMap.set(roleHash, { names: new Map(), fpKeys: [] });
      const group = roleMap.get(roleHash)!;
      group.names.set(entry.name, (group.names.get(entry.name) || 0) + 1);
      group.fpKeys.push(fpKey);
    }

    let merged = 0;
    for (const [, roleMap] of funcGroups) {
      for (const [, group] of roleMap) {
        if (group.names.size <= 1) continue;

        // Pick the simplest name: shortest, then least suffix digits
        const sorted = [...group.names.entries()].sort((a, b) => {
          const aSuffix = (a[0].match(/_(\d+)$/) || [])[1];
          const bSuffix = (b[0].match(/_(\d+)$/) || [])[1];
          const aHasSuffix = aSuffix !== undefined;
          const bHasSuffix = bSuffix !== undefined;
          if (aHasSuffix !== bHasSuffix) return aHasSuffix ? 1 : -1;
          if (a[0].length !== b[0].length) return a[0].length - b[0].length;
          return 0;
        });
        const bestName = sorted[0]![0];

        const oldNames = new Set(group.names.keys());
        oldNames.delete(bestName);

        for (const fpKey of group.fpKeys) {
          const entry = this.data.variableFingerprints![fpKey];
          if (entry && entry.name !== bestName) {
            entry.name = bestName;
            merged++;
          }
        }

        for (const [, varEntry] of Object.entries(this.data.variables)) {
          if (oldNames.has(varEntry.name)) {
            varEntry.name = bestName;
          }
        }
      }
    }

    return merged;
  }
}
