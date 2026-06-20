import type { ProjectConfig, LLMConfig } from "./types.js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import "dotenv/config";

const ROOT = resolve(import.meta.dirname ?? "..", "..");

export function getRoot(): string {
  return ROOT;
}

export function loadConfig(path: string = "config.json"): ProjectConfig {
  const p = resolve(ROOT, path);
  if (existsSync(p))
    return JSON.parse(readFileSync(p, "utf-8")) as ProjectConfig;
  return {};
}

export function resolveLLMConfig(
  overrides: Partial<LLMConfig> & { enabled?: boolean },
): LLMConfig & { enabled: boolean; concurrency: number } {
  return {
    enabled: overrides.enabled ?? (process.env.LLM_API_KEY ? true : false),
    api_base: (
      process.env.LLM_API_BASE ||
      overrides.api_base ||
      "https://api.openai.com/v1"
    ).replace(/\/+$/, ""),
    api_key: process.env.LLM_API_KEY || overrides.api_key || "",
    model: process.env.LLM_MODEL || overrides.model || "gpt-4o-mini",
    max_tokens: process.env.LLM_MAX_TOKENS || overrides.max_tokens || "16000",
    temperature: overrides.temperature ?? 0.1,
    concurrency: parseInt(
      String(process.env.LLM_CONCURRENCY || overrides.concurrency || "4"),
      10,
    ),
  };
}

export function resolvePath(
  config: ProjectConfig,
  key: keyof Pick<ProjectConfig, "clone_dir" | "src_dir" | "diffs_dir">,
  fallback: string,
): string {
  return resolve(ROOT, config[key] ?? fallback);
}
