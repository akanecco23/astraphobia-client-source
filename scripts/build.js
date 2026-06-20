import { cpSync, mkdirSync, rmSync } from "fs";
import { build } from "rolldown";
import { join } from "path";

const OUTDIR = "dist";
const EXTDIR = "extension";

rmSync(OUTDIR, { recursive: true, force: true });
mkdirSync(OUTDIR, { recursive: true });

await build({
  input: join(EXTDIR, "content.js"),
  output: {
    file: join(OUTDIR, "content.js"),
    format: "iife",
    sourcemap: "inline",
  },
  platform: "browser",
  treeshake: true,
});

cpSync(join(EXTDIR, "manifest.json"), join(OUTDIR, "manifest.json"));
cpSync(join(EXTDIR, "icon128.png"), join(OUTDIR, "icon128.png"));
