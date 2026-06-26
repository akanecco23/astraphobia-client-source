# Astraphobia Client Deobfuscator

A toolchain for deobfuscating and analyzing the Astraphobia Client Chrome extension.

## Introduction

**Astraphobia Client** is a browser extension that injects modifications into [Deeeep.io](https://deeeep.io). Because the distributed extension code is heavily obfuscated, users cannot easily verify what it actually does or whether it contains hidden functionality.

This repository contains a deobfuscation toolchain that takes the obfuscated extension code, reverses common obfuscation patterns, renames mangled identifiers using AST analysis and LLM assistance, and splits the monolithic script back into readable, modular source files. The primary goal is to ensure transparency and user safety: by making the code readable, anyone can audit it to confirm that it does not contain malware, trackers, credential stealers, or other harmful behavior.

## Table of Contents

- [Astraphobia Client Deobfuscator](#astraphobia-client-deobfuscator)
  - [Introduction](#introduction)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [Prerequisites](#prerequisites)
    - [Install Dependencies](#install-dependencies)
    - [Build the Extension](#build-the-extension)
    - [Import into Chrome](#import-into-chrome)
  - [Development](#development)
    - [Project Structure](#project-structure)
    - [Environment Variables](#environment-variables)
    - [Type Checking](#type-checking)
    - [Code Formatting](#code-formatting)
  - [Usage](#usage)
    - [Global Options](#global-options)
    - [Commands](#commands)
      - [`process`](#process)
      - [`batch`](#batch)
      - [`backward`](#backward)
      - [`status`](#status)
      - [`extract`](#extract)
      - [`rename`](#rename)
  - [Contributing](#contributing)
  - [Educational Notice](#educational-notice)

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or later recommended)
- [Yarn](https://yarnpkg.com/) (v4, managed via Corepack)

### Install Dependencies

```bash
corepack enable
yarn install
```

### Build the Extension

```bash
yarn build
```

This bundles `extension/content.js` into `dist/content.js` (IIFE format) and copies `manifest.json` and `icon128.png` into `dist/`.

### Import into Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the `dist/` folder from this repository.
5. The **Astraphobia Client** extension should now appear in your extensions list.

## Development

### Project Structure

```
.
├── deobfuscator/           # Deobfuscation toolchain
│   ├── cli.ts              # CLI entry point and command definitions
│   ├── ast-utils.ts        # AST parsing, variable extraction, renaming
│   ├── deobfuscator.ts     # Core deobfuscation orchestration
│   ├── transformer.ts      # AST transform generation and application
│   ├── renamer.ts          # LLM-assisted variable renaming
│   ├── splitter.ts         # Code splitting into modules
│   ├── splitter-config.ts  # Module assignment logic
│   ├── mapping.ts          # Persistent name-to-module mapping store
│   ├── llm.ts              # LLM client (Gemini/Gemma)
│   ├── downloader.ts       # Git clone/update helper
│   ├── config.ts           # Configuration and path resolution
│   └── types.ts            # Shared TypeScript interfaces
├── extension/              # Chrome extension source (output)
│   ├── manifest.json
│   ├── content.js          # Entry point
│   └── src/                # Split modules (features, ui, core, utils)
├── scripts/
│   └── build.js            # Rolldown bundler script
├── config.json             # Deobfuscator configuration
├── splitter-config.json    # Module definitions for the splitter
├── mapping.json            # Cached name mappings (generated)
├── transforms.json         # Cached AST transforms (generated)
└── .env                    # LLM API keys (DO NOT COMMIT)
```

### Environment Variables

Create a `.env` file in the project root to configure the LLM:

```env
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemma-4-31b-it
GEMINI_MAX_TOKENS=16000
GEMINI_CONCURRENCY=4
```

- `GEMINI_API_KEY` – Comma-separated list of API keys for rotation.
- `GEMINI_MODEL` – Model identifier (supports comma-separated fallback list).
- `GEMINI_MAX_TOKENS` – Maximum tokens per LLM request.
- `GEMINI_CONCURRENCY` – Number of concurrent LLM requests.

### Type Checking

```bash
yarn typecheck
```

### Code Formatting

```bash
yarn format
```

## Usage

The deobfuscator is a CLI tool located at `deobfuscator/cli.ts`. You can invoke it via the `deobfuscate` script.

```bash
yarn deobfuscate <command> [options]
```

### Global Options

| Option            | Description                                           |
| ----------------- | ----------------------------------------------------- |
| `--config <path>` | Path to a custom config file (default: `config.json`) |

### Commands

#### `process`

Deobfuscate a single version of the client.

```bash
yarn deobfuscate process --repo <url> --ver <version> [--no-llm]
```

| Option         | Description                                         |
| -------------- | --------------------------------------------------- |
| `--repo <url>` | Git repository URL containing the obfuscated source |
| `--ver <ver>`  | Version label (e.g., `1.9`)                         |
| `--no-llm`     | Skip LLM-powered renaming and module assignment     |

**Example:**

```bash
yarn deobfuscate process --repo https://github.com/astraphobiaaa/Astraphobia-Client-V1.9 --ver 1.9
```

**What it does:**

1. Clones or updates the target repository into `.clone/`.
2. Runs the obfuscated code through `webcrack` and custom AST transforms.
3. Generates or loads cached `transforms.json`.
4. Extracts obfuscated variables and renames them using the LLM (if enabled).
5. Assigns functions and variables to modules based on `splitter-config.json`.
6. Splits the monolithic script into modular files under `src/`.
7. Generates diffs against previous runs and copies extension assets.
8. Formats all output with Prettier.

---

#### `batch`

Process all available versions in ascending order.

```bash
yarn deobfuscate batch --start <ver> --end <ver> [--no-llm]
```

| Option          | Description                       |
| --------------- | --------------------------------- |
| `--start <ver>` | Starting version (default: `1.1`) |
| `--end <ver>`   | Ending version (default: `1.9`)   |
| `--no-llm`      | Skip LLM-powered renaming         |

**Example:**

```bash
yarn deobfuscate batch --start 1.1 --end 1.9
```

This iterates through the built-in version list, deobfuscating each one sequentially. Useful for building a complete history of the client’s evolution.

---

#### `backward`

Process versions in reverse order (newest first), saving each result into `history/` and generating inter-version patches.

```bash
yarn deobfuscate backward --start <ver> --end <ver> [--no-llm] [--fresh]
```

| Option          | Description                                                |
| --------------- | ---------------------------------------------------------- |
| `--start <ver>` | Newest version to start from (default: `1.9`)              |
| `--end <ver>`   | Earliest version to process (default: `1.1`)               |
| `--no-llm`      | Skip LLM-powered renaming                                  |
| `--fresh`       | Clear `mapping.json` and `transforms.json` before starting |

**Example:**

```bash
yarn deobfuscate backward --fresh
```

What it does:

- Runs `process` for each version from newest to oldest.
- Saves each deobfuscated output to `history/v<version>/`.
- Generates `.patch` files in `history/diffs/` showing changes between consecutive versions.
- `--fresh` is useful when you want to re-run the full pipeline without stale cached mappings.

---

#### `status`

Show the current state of the deobfuscation mapping.

```bash
yarn deobfuscate status
```

Displays:

- Currently mapped version
- Last update timestamp
- Number of mapped functions and variables
- Available diff files and their sizes

---

#### `extract`

Extract and list obfuscated variables from any JavaScript file.

```bash
yarn deobfuscate extract <file>
```

**Example:**

```bash
yarn deobfuscate extract ./some-obfuscated-script.js
```

Outputs a JSON array of variable names found in the file, useful for inspecting obfuscation patterns before committing to a full deobfuscation run.

---

#### `rename`

Apply a manual name mapping to a JavaScript file.

```bash
yarn deobfuscate rename <file> <mapping.json>
```

**Example:**

```bash
yarn deobfuscate rename ./content.js ./my-mapping.json
```

The mapping file should be a JSON object where keys are obfuscated names and values are the desired replacements. The renamed code is written to `stdout`.

## Contributing

Contributions are welcome. If you find a bug in the deobfuscation logic, have an idea for a new transform, or want to improve the LLM prompts, please open an issue or pull request.

**Guidelines:**

- Keep changes focused and well-documented.
- Ensure `yarn typecheck` passes before submitting.
- Run `yarn format` to maintain consistent code style.
- Do not commit `.env` files or API keys.

## Educational Notice

This project is intended **strictly for educational purposes** and exists to protect users of browser extensions. Installing an extension with obfuscated code is a security risk as you are granting it access to private information while being unable to verify its behavior. Deobfuscation strips away that opacity so that users can examine the code and confirm it does not hide malicious functionality.

Astraphobia Client is a third-party modification that provides unfair advantages in an online game. While this project makes its source code transparent, the intent is not to facilitate cheating or encourage its use. Rather, it is to ensure that anyone who chooses to interact with this software can do so with full knowledge of what it does. If you install browser extensions, you have a right to know exactly what code is running on your machine.

Use this knowledge responsibly. Using software that provides unfair advantages in online games is strongly discouraged, and this project does not endorse, support, or encourage circumvention of game protections or terms of service.
