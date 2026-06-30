export interface Fingerprint {
  paramCount?: number;
  bodyStatementCount?: number;
  hasLoops?: boolean;
  hasConditionals?: boolean;
  hasTryCatch?: boolean;
  callsDomApi?: boolean;
  callsMathApi?: boolean;
  callsJsonApi?: boolean;
  stringLiterals?: string[];
  numericLiterals?: number[];
  returnsCount?: number;
  propertyAccesses?: string[];
  calledFunctions?: string[];
}

export type VariableType =
  | "function_declaration"
  | "function_variable"
  | "variable"
  | "parameter";

export interface VariableInfo {
  key: string;
  originalName: string;
  scope: string;
  type: VariableType;
  fingerprint: Fingerprint;
  fingerprintHash: string;
  initType: string | null;
  code: string;
}

export interface FunctionGroup {
  funcVar: VariableInfo;
  params: VariableInfo[];
  locals: VariableInfo[];
}

export interface FunctionContext {
  originalName: string;
  scope: string;
  type: "function_declaration" | "function_variable";
  code: string;
}

export interface FunctionMappingEntry {
  name: string;
  module: string;
  fingerprintHash: string;
  fingerprint: Fingerprint;
  params: string[];
  locals: string[];
}

export interface VariableRoleFingerprint {
  initPattern: string | null;
  propertyAccesses: string[];
  methodCalls: string[];
  comparisonTargets: string[];
  assignmentTargets: string[];
  hash: string;
}

export interface VariableMappingEntry {
  name: string;
  module: string;
  roleFingerprint: VariableRoleFingerprint;
}

export interface FunctionDNA {
  stringDNA: string;
  apiDNA: string;
  propertyDNA: string;
  callDNA: string;
}

export interface MappingFile {
  _meta: {
    version: string | null;
    lastUpdated: string | null;
    description: string;
  };
  functions: Record<string, FunctionMappingEntry>;
  variables: Record<string, { name: string; module: string }>;
  variableFingerprints: Record<string, VariableMappingEntry>;
  functionDNAIndex: Record<string, string>;
  canonicalNames: Record<string, string>;
}

export interface TransformEntry {
  type:
    | "unwrap_iife"
    | "hoist_declarations"
    | "group_variables"
    | "extract_constant";
  description: string;
  target: string;
  params: Record<string, string>;
}

export interface TransformsFile {
  _meta: {
    version: string | null;
    lastUpdated: string | null;
    description: string;
  };
  transforms: TransformEntry[];
  moduleAssignments: Record<string, string>;
}

export interface ModuleFile {
  name: string;
  path: string;
  code: string;
  exports: string[];
  imports: string[];
}

export interface SplitResult {
  modules: ModuleFile[];
  entry: string;
}

export interface SplitterModuleDef {
  path: string;
  description?: string;
}

export interface SplitterBootstrapConfig {
  exactNames: string[];
  prefixes: string[];
  suffixes: string[];
  minCallees: number;
}

export interface SplitterConfig {
  _meta: {
    version: string | null;
    lastUpdated: string | null;
    description: string;
  };
  modules: Record<string, SplitterModuleDef>;
  bootstrap: SplitterBootstrapConfig;
  scoreThreshold: number;
}

export interface LLMConfig {
  enabled?: boolean;
  api_base?: string;
  api_key?: string;
  model?: string;
  max_tokens?: string | number;
  temperature?: number;
  concurrency?: number;
}

export interface ProjectConfig {
  target_repo?: string;
  repo_name?: string;
  clone_dir?: string;
  src_dir?: string;
  diffs_dir?: string;
  target_file?: string;
  llm?: LLMConfig;
}

export const VERSIONS: Record<string, string> = {
  "1.1": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.1",
  "1.2": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.2",
  "1.3": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.3",
  "1.4": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.4",
  "1.5":
    "https://github.com/astraphobiaaa/Halloween-Update---Astraphobia-Client-V1.5",
  "1.6": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.6",
  "1.7": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.7",
  "1.8": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.8",
  "1.9": "https://github.com/astraphobiaaa/Astraphobia-Client-V1.9",
};
