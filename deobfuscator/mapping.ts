import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import type { MappingFile, FunctionMappingEntry } from "./types.js";
import { computeSimilarity } from "./ast-utils.js";
import type { Fingerprint } from "./types.js";
import { resolve } from "path";

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
        if (raw._meta && (raw.functions || raw.variables))
          return raw as MappingFile;
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
}
