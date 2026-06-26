import type { LLMConfig, TransformEntry } from "./types.js";
import { GoogleGenAI } from "@google/genai";
import { log } from "./logger.js";

export interface ResolvedLLMConfig extends LLMConfig {
  enabled: boolean;
  concurrency: number;
}

const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;

export class LLMClient {
  enabled: boolean;
  model: string;
  models: string[];
  maxTokens: number;
  temperature: number;
  concurrency: number;
  private apiKeys: string[];
  private keyIndex: number;

  constructor(config: ResolvedLLMConfig) {
    this.enabled = config.enabled;
    this.models = (config.model ?? "gemma-4-31b-it")
      .split(",")
      .map((m) => m.trim())
      .filter(Boolean);
    this.model = this.models[0] ?? "gemma-4-31b-it";
    this.maxTokens = parseInt(String(config.max_tokens ?? "16000"), 10);
    this.temperature = config.temperature ?? 0.1;
    this.concurrency = config.concurrency ?? 4;
    this.apiKeys = (config.api_key ?? "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    this.keyIndex = 0;
  }

  private getClient(): GoogleGenAI {
    if (this.apiKeys.length === 0) {
      throw new Error("No Gemini API keys configured");
    }
    return new GoogleGenAI({
      apiKey: this.apiKeys[this.keyIndex % this.apiKeys.length]!,
    });
  }

  private rotateKey(): void {
    this.keyIndex = (this.keyIndex + 1) % this.apiKeys.length;
    log(
      "warn",
      `Rotated to Gemini API key #${this.keyIndex + 1}/${this.apiKeys.length}`,
    );
  }

  private async generateWithBackoff(
    params: {
      model: string;
      contents: string;
      config?: {
        systemInstruction?: string;
        temperature?: number;
        maxOutputTokens?: number;
      };
    },
    attempt = 0,
    modelIndex = 0,
  ): Promise<string> {
    const ai = this.getClient();
    const currentModel = this.models[modelIndex] ?? this.model;
    try {
      const response = (await Promise.race([
        ai.models.generateContent({
          ...params,
          model: currentModel,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("LLM request timeout after 60s")),
            60000,
          ),
        ),
      ])) as Awaited<ReturnType<typeof ai.models.generateContent>>;
      return response.text ?? "";
    } catch (e: unknown) {
      const err = e as {
        status?: number;
        message?: string;
        name?: string;
        cause?: unknown;
        response?: { text?: string; status?: number };
      };
      const status = err?.status;
      const errorDetails = JSON.stringify(
        {
          name: err?.name,
          message: err?.message,
          status: err?.status,
          cause: err?.cause,
          response: err?.response,
          model: currentModel,
          promptLength: params.contents.length,
        },
        null,
        2,
      );
      if (
        (status === 429 || status === 503 || status === 504) &&
        attempt < MAX_RETRIES &&
        this.apiKeys.length > 1
      ) {
        this.rotateKey();
        const delay =
          BASE_DELAY_MS * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
        log(
          "warn",
          `Rate limited/overloaded (${status}), rotating key, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES})\nDetails: ${errorDetails}`,
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.generateWithBackoff(params, attempt + 1, modelIndex);
      }
      if (attempt < MAX_RETRIES) {
        const delay =
          BASE_DELAY_MS * Math.pow(2, attempt) * (0.75 + Math.random() * 0.5);
        log(
          "warn",
          `API error, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_RETRIES}): ${err?.message ?? String(e)}\nDetails: ${errorDetails}`,
        );
        await new Promise((r) => setTimeout(r, delay));
        return this.generateWithBackoff(params, attempt + 1, modelIndex);
      }
      if (modelIndex < this.models.length - 1) {
        log(
          "warn",
          `Model ${currentModel} failed after ${MAX_RETRIES} attempts, falling back to ${this.models[modelIndex + 1]}`,
        );
        return this.generateWithBackoff(params, 0, modelIndex + 1);
      }
      log(
        "error",
        `LLM request failed after ${MAX_RETRIES} attempts. Details: ${errorDetails}`,
      );
      throw e;
    }
  }

  async renameFunction(fnCode: string): Promise<Record<string, string>> {
    const results = await this.renameFunctionBatch([
      { code: fnCode, name: "" },
    ]);
    return results[0] ?? {};
  }

  async renameFunctionBatch(
    fns: { code: string; name: string }[],
  ): Promise<Record<string, string>[]> {
    if (!this.enabled || this.apiKeys.length === 0) return fns.map(() => ({}));
    const CHUNK_SIZE = 8000;
    const chunks: { code: string; name: string }[][] = [];
    let current: { code: string; name: string }[] = [];
    let currentLen = 0;
    for (const fn of fns) {
      const fnCode =
        fn.code.length > 2000
          ? fn.code.slice(0, 2000) + "\n// ... truncated"
          : fn.code;
      if (currentLen + fnCode.length > CHUNK_SIZE && current.length > 0) {
        chunks.push(current);
        current = [];
        currentLen = 0;
      }
      current.push({ code: fnCode, name: fn.name });
      currentLen += fnCode.length;
    }
    if (current.length > 0) chunks.push(current);

    const allResults: Record<string, string>[] = new Array(fns.length).fill({});
    let fnOffset = 0;
    for (const chunk of chunks) {
      const chunkCode = chunk
        .map(
          (fn, i) =>
            `// --- Function ${i + 1}${fn.name ? `: ${fn.name}` : ""} ---\n${fn.code}`,
        )
        .join("\n\n");
      const prompt = [
        `Below are ${chunk.length} JavaScript functions. Rename ALL obfuscated identifiers (_0x hex names) in EVERY function to meaningful camelCase names.`,
        "Rename function names, parameter names, and local variable names.",
        "Return ONLY a valid JSON object mapping each obfuscated name to its new name across ALL functions.",
        "No explanation, no markdown, just raw JSON.",
        "",
        "```javascript",
        chunkCode,
        "```",
      ].join("\n");

      try {
        const text = await this.generateWithBackoff({
          model: this.model,
          contents: prompt,
          config: {
            systemInstruction:
              "You are a JavaScript reverse-engineering expert. You rename obfuscated variables to meaningful camelCase names. You ONLY output valid JSON. No explanation.",
            maxOutputTokens: this.maxTokens,
            temperature: this.temperature,
          },
        });
        const mapping = parseResponse(text);
        for (let i = 0; i < chunk.length; i++) {
          allResults[fnOffset + i] = mapping;
        }
        log(
          "info",
          `  LLM batch renamed ${chunk.length} functions (${Object.keys(mapping).length} names)`,
        );
      } catch (e) {
        log("error", `LLM batch rename error: ${(e as Error).message}`);
      }
      fnOffset += chunk.length;
    }
    return allResults;
  }

  async renameAllInContext(codeChunk: string): Promise<Record<string, string>> {
    if (!this.enabled || this.apiKeys.length === 0) return {};
    const prompt = [
      "Rename ALL obfuscated identifiers in this JavaScript code to meaningful camelCase names.",
      "This includes function names, variable names, parameter names, and property names that are obfuscated.",
      "Return ONLY a valid JSON object mapping each obfuscated name to its new meaningful name.",
      "No explanation, no markdown, just raw JSON.",
      "",
      "```javascript",
      codeChunk.length > 6000
        ? codeChunk.slice(0, 6000) + "\n// ... truncated"
        : codeChunk,
      "```",
    ].join("\n");

    try {
      const text = await this.generateWithBackoff({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction:
            "You are a JavaScript reverse-engineering expert. You rename obfuscated identifiers to meaningful camelCase names. You ONLY output valid JSON. No explanation.",
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
        },
      });
      return parseResponse(text);
    } catch (e) {
      log("error", `LLM renameAll error: ${(e as Error).message}`);
      return {};
    }
  }

  async renameVarBatchWithContext(
    vars: { name: string; declaration: string; usages: string[] }[],
  ): Promise<Record<string, string>> {
    if (!this.enabled || this.apiKeys.length === 0) return {};
    const prompt = [
      "Below are obfuscated JavaScript variables and how they are declared/used.",
      "For each variable name shown, suggest ONE meaningful camelCase name that describes its PURPOSE/CONTENT.",
      "Return ONLY a valid JSON object mapping each obfuscated name to its new name.",
      "No explanation, no markdown, just raw JSON.",
      "",
      ...vars.flatMap((v) => [
        `// variable ${v.name}`,
        `//   declaration: ${v.declaration}`,
        v.usages.length > 0
          ? `//   usages: ${v.usages.map((u) => u.replace(/\s+/g, " ")).join("; ")}`
          : "//   usages: (none observed in this context)",
      ]),
    ].join("\n");

    try {
      const text = await this.generateWithBackoff({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction:
            "You are a JavaScript reverse-engineering expert. You name variables cleanly based on declaration + usage context. You ONLY output valid JSON. No explanation.",
          maxOutputTokens: this.maxTokens,
          temperature: 0,
        },
      });
      const out = parseResponse(text);
      if (Object.keys(out).length === 0 && vars.length > 0) {
        log(
          "warn",
          `LLM renameVars returned no names for: ${vars.map((i) => i.name).join(", ")}`,
        );
        log("warn", `Raw response: ${text.slice(0, 500)}`);
      } else if (vars.length <= 3) {
        log(
          "info",
          `LLM renameVars response: ${JSON.stringify(out).slice(0, 300)}`,
        );
      }
      return out;
    } catch (e) {
      log("error", `LLM renameVars error: ${(e as Error).message}`);
      return {};
    }
  }

  async suggestTransforms(codeSnippet: string): Promise<TransformEntry[]> {
    if (!this.enabled || this.apiKeys.length === 0) return [];
    const prompt = [
      "Analyze this obfuscated JavaScript code and suggest AST transforms to clean it up.",
      "Available transform types: unwrap_iife, hoist_declarations, extract_constant, group_variables.",
      "Return ONLY a JSON array of transform objects with {type, description, target, params}.",
      "No explanation, just the JSON array.",
      "",
      "```javascript",
      codeSnippet.slice(0, 3000),
      "```",
    ].join("\n");

    try {
      const text = await this.generateWithBackoff({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction:
            "You suggest AST transforms to clean up obfuscated JS. You ONLY output valid JSON arrays.",
          maxOutputTokens: 4000,
          temperature: 0,
        },
      });
      let jsonStr = text.trim();
      const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (fence?.[1]) jsonStr = fence[1];
      else {
        const bracket = jsonStr.match(/\[[\s\S]*\]/);
        if (bracket) jsonStr = bracket[0];
      }
      return JSON.parse(jsonStr) as TransformEntry[];
    } catch (e) {
      log("error", `LLM suggestTransforms error: ${(e as Error).message}`);
      return [];
    }
  }

  async chat(
    prompt: string,
    opts?: {
      systemPrompt?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<string> {
    if (!this.enabled || this.apiKeys.length === 0) return "";
    try {
      return await this.generateWithBackoff({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction:
            opts?.systemPrompt ??
            "You are a helpful assistant. You ONLY output valid JSON.",
          maxOutputTokens: opts?.maxTokens ?? this.maxTokens,
          temperature: opts?.temperature ?? this.temperature,
        },
      });
    } catch (e) {
      log("error", `LLM chat error: ${(e as Error).message}`);
      return "";
    }
  }

  async assignModule(
    funcCode: string,
    funcName: string,
    existingModules: string[],
  ): Promise<string> {
    if (!this.enabled || this.apiKeys.length === 0) return "core";
    const prompt = [
      `A function named "${funcName}" needs to be assigned to a module.`,
      `Existing modules: ${existingModules.join(", ")}`,
      "Pick the best module for this function, or suggest a new module name if none fit.",
      "Return ONLY the module name as a plain string, no quotes, no explanation.",
      "",
      "```javascript",
      funcCode.length > 1500
        ? funcCode.slice(0, 1500) + "\n// ... truncated"
        : funcCode,
      "```",
    ].join("\n");

    try {
      const text = await this.generateWithBackoff({
        model: this.model,
        contents: prompt,
        config: {
          systemInstruction:
            "You are a JavaScript code organization expert. You assign functions to modules based on their purpose. You ONLY output a module name.",
          maxOutputTokens: 50,
          temperature: 0,
        },
      });
      const content = text.trim();
      const name = content.replace(/[^a-zA-Z0-9_]/g, "");
      return name || "core";
    } catch (e) {
      log("error", `LLM module assignment error: ${(e as Error).message}`);
      return "core";
    }
  }
}

export async function batchConcurrent<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  concurrency: number = 4,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let running = 0;
  let index = 0;

  return new Promise((resolve, reject) => {
    if (items.length === 0) {
      resolve(results);
      return;
    }
    function next(): void {
      while (running < concurrency && index < items.length) {
        const i = index++;
        running++;
        fn(items[i]!)
          .then((result) => {
            results[i] = result;
            running--;
            if (index >= items.length && running === 0) resolve(results);
            else next();
          })
          .catch(reject);
      }
    }
    next();
  });
}

function parseResponse(content: string): Record<string, string> {
  let jsonStr = content.trim();
  const fence = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence?.[1]) jsonStr = fence[1];
  else {
    const brace = jsonStr.match(/\{[\s\S]*\}/);
    if (brace) jsonStr = brace[0];
  }
  try {
    jsonStr = jsonStr.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
    const result = JSON.parse(jsonStr) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(result)) {
      if (
        typeof v === "string" &&
        /^(_0x[a-f0-9]+|[a-z]{1,2}_?[0-9a-f]{4,})$/.test(k)
      )
        out[k] = v;
    }
    return out;
  } catch {
    const out: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const m = line.match(
        /["']?(_0x[a-f0-9]+|_?[a-z0-9]{5,})["']?\s*[:=]\s*["'](\w+)["']/,
      );
      if (m?.[1] && m[2]) out[m[1]] = m[2];
    }
    return out;
  }
}
