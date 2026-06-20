import { existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { log } from "./logger.js";
import { join } from "path";

export function cloneOrUpdate(
  url: string,
  version: string,
  cloneDir: string,
): string {
  const repoPath = join(cloneDir, `v${version}`);
  mkdirSync(cloneDir, { recursive: true });

  if (existsSync(repoPath)) {
    log("info", `Updating existing clone at ${repoPath}`);
    runGit("fetch --all", repoPath);
    runGit("reset --hard origin/HEAD", repoPath);
  } else {
    mkdirSync(repoPath, { recursive: true });
    log("info", `Cloning ${url}`);
    execSync(`git clone --depth 1 "${url}" "${repoPath}"`, { stdio: "pipe" });
  }

  return repoPath;
}

function runGit(args: string, cwd: string): string | null {
  try {
    return execSync(`git ${args}`, {
      cwd,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}
