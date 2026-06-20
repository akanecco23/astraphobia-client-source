type LogLevel = "info" | "warn" | "error" | "cyan";

const COLORS: Record<LogLevel, string> = {
  info: "\x1b[92m",
  warn: "\x1b[93m",
  error: "\x1b[91m",
  cyan: "\x1b[96m",
};
const RESET = "\x1b[0m";

export function log(level: LogLevel, msg: string): void {
  const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });
  console.log(`${COLORS[level]}[${ts}] ${msg}${RESET}`);
}
