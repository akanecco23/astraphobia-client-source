import { readFileSync, cpSync, existsSync } from "fs";
import { extractVariables } from "./ast-utils.js";
import type { VariableInfo } from "./types.js";
import { webcrack } from "webcrack";
import { log } from "./logger.js";
import { join } from "path";

export interface DeobfuscationResult {
  code: string;
  variables: VariableInfo[];
}

export async function deobfuscate(
  obfFilePath: string,
): Promise<DeobfuscationResult> {
  log("info", `Deobfuscating ${obfFilePath} with webcrack`);
  const obfCode = readFileSync(obfFilePath, "utf-8");

  let deobfCode: string;
  try {
    const result = await webcrack(obfCode);
    deobfCode = result.code;
    log("info", `Deobfuscated: ${deobfCode.length} bytes`);
  } catch (e) {
    log("error", `webcrack failed: ${(e as Error).message}`);
    deobfCode = obfCode;
  }

  let variables: VariableInfo[] = [];
  try {
    variables = extractVariables(deobfCode);
    log("info", `Found ${variables.length} obfuscated variables`);
  } catch (e) {
    log("error", `AST extraction failed: ${(e as Error).message}`);
  }

  return { code: deobfCode, variables };
}

export function copyExtras(repoPath: string, srcDir: string): void {
  for (const extra of ["manifest.json", "icon128.png"]) {
    const src = join(repoPath, extra);
    if (existsSync(src)) cpSync(src, join(srcDir, extra));
  }
}
