import type { SplitterConfig, SplitterModuleDef } from "./types.js";
import { existsSync, readFileSync, writeFileSync } from "fs";
import type { LLMClient } from "./llm.js";
import { getRoot } from "./config.js";
import { log } from "./logger.js";
import { resolve } from "path";

const CONFIG_PATH = resolve(getRoot(), "splitter-config.json");

const DEFAULT_CONFIG: SplitterConfig = {
  _meta: {
    version: null,
    lastUpdated: null,
    description:
      "Module definitions and bootstrap patterns for the splitter. Edit to customize.",
  },
  modules: {
    core: {
      path: "core",
      description:
        "initialization, bootstrap, game hook, proxy wrapping, state resolution, obfuscated key discovery, player data, game instance, socket manager, packet encoding, viewport, zoom clamp, control overlay, Reflect, PropertyNames, sendBytePacket, TextEncoder",
    },
    utils: {
      path: "utils",
      description:
        "shared utilities, property enumeration, distance calculation, entity lookup, canvas helpers",
    },
    storage: { path: "storage" },
    ui_panels: {
      path: "ui/panels",
      description:
        "Main UI panels, toggle, settings menu, panel creation, DOM construction, innerHTML, createElement, appendChild",
    },
  },
  bootstrap: {
    exactNames: [],
    prefixes: ["launch", "init", "start", "setup"],
    suffixes: ["OnLoad", "Bootstrap", "Application"],
    minCallees: 3,
  },
  scoreThreshold: 5,
};

export function loadSplitterConfig(path?: string): SplitterConfig {
  const p = path ?? CONFIG_PATH;
  if (existsSync(p)) {
    try {
      return JSON.parse(readFileSync(p, "utf-8")) as SplitterConfig;
    } catch {
      log("warn", `Failed to parse ${p}, using defaults`);
    }
  }
  return { ...DEFAULT_CONFIG, _meta: { ...DEFAULT_CONFIG._meta } };
}

export function saveSplitterConfig(
  config: SplitterConfig,
  path?: string,
): void {
  const p = path ?? CONFIG_PATH;
  config._meta.lastUpdated = new Date().toISOString();
  writeFileSync(p, JSON.stringify(config, null, 2) + "\n", "utf-8");
  log("info", `Saved splitter config to ${p}`);
}

export function getModulePath(
  config: SplitterConfig,
  moduleName: string,
): string | null {
  return config.modules[moduleName]?.path ?? null;
}

export function getAllModuleNames(config: SplitterConfig): string[] {
  return Object.keys(config.modules);
}

export function getModulePaths(config: SplitterConfig): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, def] of Object.entries(config.modules)) {
    out[name] = def.path;
  }
  return out;
}

export function isBootstrapFunction(
  config: SplitterConfig,
  declName: string,
  calleeCount: number,
): boolean {
  if (config.bootstrap.exactNames.includes(declName)) return true;
  if (
    config.bootstrap.prefixes.some((p) => declName.startsWith(p)) ||
    config.bootstrap.suffixes.some((s) => declName.endsWith(s))
  ) {
    if (calleeCount >= config.bootstrap.minCallees) return true;
  }
  return false;
}

export interface ModuleAssignmentInput {
  functions: { name: string; code: string }[];
  variables: { name: string; code: string }[];
  windowProps: string[];
}

export interface ModuleAssignmentOutput {
  functionAssignments: Record<string, string>;
  variableAssignments: Record<string, string>;
  windowPropAssignments: Record<string, string>;
  newModules: Record<string, SplitterModuleDef>;
}

export async function generateModuleAssignments(
  llm: LLMClient,
  input: ModuleAssignmentInput,
  existingConfig: SplitterConfig,
): Promise<ModuleAssignmentOutput> {
  if (!llm.enabled) {
    return {
      functionAssignments: {},
      variableAssignments: {},
      windowPropAssignments: {},
      newModules: {},
    };
  }

  const existingModules = Object.entries(existingConfig.modules)
    .map(([name, def]) => `  ${name} (${def.path}): ${def.description ?? ""}`)
    .join("\n");

  const funcList = input.functions
    .map(
      (f) =>
        `// FUNCTION: ${f.name}\n${f.code.length > 200 ? f.code.slice(0, 200) + " // ..." : f.code}`,
    )
    .join("\n\n");

  const varList = input.variables
    .map(
      (v) =>
        `// VARIABLE: ${v.name}\n${v.code.length > 150 ? v.code.slice(0, 150) + " // ..." : v.code}`,
    )
    .join("\n");

  const windowList =
    input.windowProps.length > 0
      ? input.windowProps.map((p) => `  window.${p}`).join("\n")
      : "  (none)";

  const prompt = [
    "You are organizing a deobfuscated JavaScript game cheat client into modules.",
    "",
    "EXISTING MODULES:",
    existingModules,
    "",
    "TASK: Assign each function and variable below to the most appropriate existing module.",
    "If a function/variable doesn't fit any existing module, you may suggest a NEW module name.",
    "Also assign each window.* property to the module that owns it.",
    "",
    "Return ONLY a valid JSON object with this exact structure:",
    "{",
    '  "functionAssignments": { "functionName": "module_name", ... },',
    '  "variableAssignments": { "variableName": "module_name", ... },',
    '  "windowPropAssignments": { "windowPropName": "module_name", ... },',
    '  "newModules": { "new_module_name": { "path": "path/to/file", "description": "..." } }',
    "}",
    "",
    "FUNCTIONS:",
    funcList || "  (none)",
    "",
    "VARIABLES:",
    varList || "  (none)",
    "",
    "WINDOW PROPERTIES:",
    windowList,
    "",
    "No explanation, no markdown, just raw JSON.",
  ].join("\n");

  try {
    const result = await llm.chat(prompt, {
      systemPrompt:
        "You are a JavaScript code organization expert. You classify functions and variables into modules. You ONLY output valid JSON.",
      maxTokens: 8000,
      temperature: 0,
    });

    const parsed = parseModuleAssignments(result);
    log(
      "info",
      `LLM assigned ${Object.keys(parsed.functionAssignments).length} functions, ${Object.keys(parsed.variableAssignments).length} variables, ${Object.keys(parsed.windowPropAssignments).length} window props`,
    );
    if (Object.keys(parsed.newModules).length > 0) {
      log(
        "info",
        `LLM suggested ${Object.keys(parsed.newModules).length} new modules: ${Object.keys(parsed.newModules).join(", ")}`,
      );
    }
    return parsed;
  } catch (e) {
    log("error", `LLM module assignment error: ${(e as Error).message}`);
    return {
      functionAssignments: {},
      variableAssignments: {},
      windowPropAssignments: {},
      newModules: {},
    };
  }
}

function parseModuleAssignments(content: string): ModuleAssignmentOutput {
  let jsonStr = content.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence?.[1]) jsonStr = fence[1];
  else {
    const brace = jsonStr.match(/\{[\s\S]*\}/);
    if (brace) jsonStr = brace[0];
  }
  try {
    jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
    return {
      functionAssignments: asStringRecord(parsed.functionAssignments),
      variableAssignments: asStringRecord(parsed.variableAssignments),
      windowPropAssignments: asStringRecord(parsed.windowPropAssignments),
      newModules: asModuleDefRecord(parsed.newModules),
    };
  } catch {
    return {
      functionAssignments: {},
      variableAssignments: {},
      windowPropAssignments: {},
      newModules: {},
    };
  }
}

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

function asModuleDefRecord(value: unknown): Record<string, SplitterModuleDef> {
  if (!value || typeof value !== "object") return {};
  const out: Record<string, SplitterModuleDef> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v && typeof v === "object") {
      const def = v as Record<string, unknown>;
      if (typeof def.path === "string") {
        out[k] = {
          path: def.path,
          description:
            typeof def.description === "string" ? def.description : undefined,
        };
      }
    }
  }
  return out;
}
