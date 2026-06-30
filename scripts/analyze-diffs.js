import { readFileSync, readdirSync } from "fs";
import { fileURLToPath } from "url";
import * as path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const diffsDir = path.resolve(__dirname, "..", "history", "diffs");

function analyzePatches() {
  const patches = readdirSync(diffsDir)
    .filter((f) => f.endsWith(".patch"))
    .sort();

  for (const patchFile of patches) {
    const patchPath = path.join(diffsDir, patchFile);
    const lines = readFileSync(patchPath, "utf-8").split("\n");

    console.log(`\n=== ${patchFile} ===`);

    let renameCount = 0;
    const renames = [];

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];

      if (!line.startsWith("-") || !nextLine.startsWith("+")) continue;
      if (line.startsWith("---") || line.startsWith("+++")) continue;

      // Strip the diff prefix
      const oldText = line.substring(1).trim();
      const newText = nextLine.substring(1).trim();

      // Check for variable/function renames where only the name changed
      const oldVarMatch = oldText.match(
        /^(const|let|var|function)\s+(\w+)(.*)/,
      );
      const newVarMatch = newText.match(
        /^(const|let|var|function)\s+(\w+)(.*)/,
      );

      if (oldVarMatch && newVarMatch) {
        const [, oldKeyword, oldName, oldRest] = oldVarMatch;
        const [, newKeyword, newName, newRest] = newVarMatch;

        if (oldKeyword === newKeyword && oldRest === newRest) {
          renameCount++;
          if (renames.length < 5) {
            renames.push(`  ${oldKeyword} ${oldName} -> ${newName}`);
          }
        }
      }

      // Check for parameter renames in function declarations
      const oldFuncMatch = oldText.match(/^(function\s+\w+)\((.*)\)(.*)/);
      const newFuncMatch = newText.match(/^(function\s+\w+)\((.*)\)(.*)/);

      if (oldFuncMatch && newFuncMatch) {
        const [, oldPrefix, oldParams, oldRest] = oldFuncMatch;
        const [, newPrefix, newParams, newRest] = newFuncMatch;

        if (
          oldPrefix === newPrefix &&
          oldRest === newRest &&
          oldParams !== newParams
        ) {
          renameCount++;
          if (renames.length < 5) {
            renames.push(`  params: (${oldParams}) -> (${newParams})`);
          }
        }
      }
    }

    console.log(`  Total renames: ${renameCount}`);
    renames.forEach((r) => console.log(r));
  }
}

analyzePatches();
