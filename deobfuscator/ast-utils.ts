import type {
  Fingerprint,
  VariableInfo,
  FunctionGroup,
  FunctionContext,
} from "./types.js";
import { parse, type ParserPlugin } from "@babel/parser";
import _generate from "@babel/generator";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (_traverse as any).default ?? _traverse;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (_generate as any).default ?? _generate;

const OBFUSCATED_RE = /^(_0x[a-f0-9]+|[a-z]{1,2}_?[0-9a-f]{4,})$/;

const DOM_APIS = [
  "document",
  "window",
  "localStorage",
  "sessionStorage",
  "navigator",
  "fetch",
  "XMLHttpRequest",
  "HTMLElement",
  "querySelector",
  "createElement",
  "getElementById",
  "addEventListener",
  "removeEventListener",
  "appendChild",
  "removeChild",
  "dispatchEvent",
  "innerHTML",
  "textContent",
  "style",
  "classList",
  "className",
  "setAttribute",
  "getAttribute",
  "removeAttribute",
  "insertBefore",
  "replaceChild",
];
const MATH_APIS = [
  "Math.random",
  "Math.floor",
  "Math.ceil",
  "Math.abs",
  "Math.round",
  "Math.sin",
  "Math.cos",
  "Math.tan",
  "Math.sqrt",
  "Math.pow",
  "Math.min",
  "Math.max",
  "Math.PI",
];
const JSON_APIS = ["JSON.parse", "JSON.stringify"];

export function isObfuscated(name: string): boolean {
  return OBFUSCATED_RE.test(name);
}

export function parseCode(code: string) {
  // Remove "use strict" directives to avoid strict mode parsing errors
  // (e.g., obfuscated code may use `arguments` as a binding name)
  const sanitized = code.replace(/\s*["']use strict["'];?\s*/g, "");
  return parse(sanitized, {
    sourceType: "script",
    allowReturnOutsideFunction: true,
    plugins: [
      "optionalChaining",
      "nullishCoalescingOperator",
      "classProperties",
      "objectRestSpread",
      "optionalCatchBinding",
    ] as unknown as ParserPlugin[],
  });
}

export function computeFunctionFingerprint(funcNode: t.Node): Fingerprint {
  const fp: Fingerprint = {
    paramCount: 0,
    bodyStatementCount: 0,
    hasLoops: false,
    hasConditionals: false,
    hasTryCatch: false,
    callsDomApi: false,
    callsMathApi: false,
    callsJsonApi: false,
    stringLiterals: [],
    numericLiterals: [],
    returnsCount: 0,
    propertyAccesses: [],
    calledFunctions: [],
  };

  let node: t.Node = funcNode;
  if (
    t.isVariableDeclarator(funcNode) &&
    funcNode.init &&
    (t.isFunctionExpression(funcNode.init) ||
      t.isArrowFunctionExpression(funcNode.init))
  )
    node = funcNode.init;
  else if (
    t.isAssignmentExpression(funcNode) &&
    funcNode.right &&
    (t.isFunctionExpression(funcNode.right) ||
      t.isArrowFunctionExpression(funcNode.right))
  )
    node = funcNode.right;

  const fn = node as t.Function;
  if (fn.params) fp.paramCount = fn.params.length;
  const body = fn.body;
  if (!body) return fp;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bodyCode =
      typeof body === "object" && body.type ? (generate as any)(body).code : "";
    fp.bodyStatementCount = (bodyCode.match(/;/g) || []).length;
    fp.hasLoops = /\bfor\s*\(|while\s*\(|do\s*\{/.test(bodyCode);
    fp.hasConditionals = /\bif\s*\(|switch\s*\(/.test(bodyCode);
    fp.hasTryCatch = /\btry\s*\{/.test(bodyCode);
    fp.returnsCount = (bodyCode.match(/\breturn\b/g) || []).length;
    fp.callsDomApi = DOM_APIS.some((a) => bodyCode.includes(a));
    fp.callsMathApi = MATH_APIS.some((a) => bodyCode.includes(a));
    fp.callsJsonApi = JSON_APIS.some((a) => bodyCode.includes(a));

    const extract = (re: RegExp, limit: number): string[] => {
      const items: string[] = [];
      const seen = new Set<string>();
      let m: RegExpExecArray | null = re.exec(bodyCode);
      while (m !== null) {
        const val = m[1] ?? m[2] ?? "";
        if (val && !seen.has(val) && seen.size < limit) {
          items.push(val);
          seen.add(val);
        }
        m = re.exec(bodyCode);
      }
      return items;
    };
    const isObfuscatedName = (s: string) =>
      /^(_0x[a-f0-9]+|[a-z]{1,2}_?[0-9a-f]{4,})$/.test(s);
    fp.stringLiterals = extract(/(["'`])((?:(?!\1).){1,80})\1/g, 20).filter(
      (s) => !isObfuscatedName(s),
    );
    fp.propertyAccesses = extract(
      /(\b[A-Za-z_$][\w$]*)\.([A-Za-z_$][\w$]*)/g,
      30,
    ).filter((s) => {
      const parts = s.split(".");
      return !parts.some((p) => isObfuscatedName(p));
    });
    fp.calledFunctions = extract(
      /(\b[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\(/g,
      20,
    ).filter((s) => !isObfuscatedName(s));
  } catch {
    /* */
  }
  return fp;
}

export function fingerprintHash(fp: Fingerprint): string {
  return [
    fp.paramCount ?? 0,
    fp.hasLoops ? 1 : 0,
    fp.hasConditionals ? 1 : 0,
    fp.hasTryCatch ? 1 : 0,
    fp.callsDomApi ? 1 : 0,
    fp.callsMathApi ? 1 : 0,
    fp.callsJsonApi ? 1 : 0,
    fp.returnsCount ?? 0,
    fp.bodyStatementCount ?? 0,
    (fp.stringLiterals ?? []).slice(0, 10).sort().join("|"),
    (fp.propertyAccesses ?? []).slice(0, 15).sort().join("|"),
    (fp.calledFunctions ?? []).slice(0, 10).sort().join("|"),
  ].join("::");
}

export function computeSimilarity(fp1: Fingerprint, fp2: Fingerprint): number {
  if (!fp1 || !fp2) return 0;
  let matches = 0,
    total = 0;
  for (const k of [
    "hasLoops",
    "hasConditionals",
    "hasTryCatch",
    "callsDomApi",
    "callsMathApi",
    "callsJsonApi",
  ] as const) {
    total++;
    if (fp1[k] === fp2[k]) matches++;
  }
  for (const k of [
    "paramCount",
    "returnsCount",
    "bodyStatementCount",
  ] as const) {
    total++;
    const a = fp1[k] ?? 0,
      b = fp2[k] ?? 0,
      mx = Math.max(a, b, 1);
    matches += 1 - Math.abs(a - b) / mx;
  }
  for (const k of [
    "stringLiterals",
    "propertyAccesses",
    "calledFunctions",
  ] as const) {
    const s1 = new Set(fp1[k] ?? []),
      s2 = new Set(fp2[k] ?? []);
    const inter = [...s1].filter((x) => s2.has(x)).length,
      union = new Set([...s1, ...s2]).size;
    if (union > 0) {
      total++;
      matches += inter / union;
    }
  }
  return total > 0 ? matches / total : 0;
}

export function extractVariables(code: string): VariableInfo[] {
  const ast = parseCode(code);
  const scopeVars = new Map<string, VariableInfo>();
  const scopeStack: string[] = ["global"];

  function collectDestructuredIds(pattern: t.Node, scopeKey: string): void {
    if (t.isIdentifier(pattern)) {
      if (
        isObfuscated(pattern.name) &&
        !scopeVars.has(`${scopeKey}::${pattern.name}`)
      ) {
        scopeVars.set(`${scopeKey}::${pattern.name}`, {
          key: `${scopeKey}::${pattern.name}`,
          originalName: pattern.name,
          scope: scopeKey,
          type: "variable",
          fingerprint: {},
          fingerprintHash: "",
          initType: null,
          code: "",
        });
      }
    } else if (t.isObjectPattern(pattern)) {
      for (const prop of pattern.properties) {
        if (t.isRestElement(prop))
          collectDestructuredIds(prop.argument, scopeKey);
        else if (t.isObjectProperty(prop))
          collectDestructuredIds(prop.value, scopeKey);
      }
    } else if (t.isArrayPattern(pattern)) {
      for (const el of pattern.elements) {
        if (el) collectDestructuredIds(el, scopeKey);
      }
    } else if (t.isRestElement(pattern)) {
      collectDestructuredIds(pattern.argument, scopeKey);
    } else if (t.isAssignmentPattern(pattern)) {
      collectDestructuredIds(pattern.left, scopeKey);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (traverse as any)(ast, {
    FunctionDeclaration(path: any) {
      const name: string | null = path.node.id ? path.node.id.name : null;
      if (name && isObfuscated(name)) {
        const scopeKey = scopeStack.join("/");
        const key = `${scopeKey}::${name}`;
        if (!scopeVars.has(key)) {
          const fp = computeFunctionFingerprint(path.node);
          let snippet = "";
          try {
            snippet = (generate as any)(path.node).code;
          } catch {
            /* */
          }
          if (snippet.length > 2000)
            snippet = snippet.slice(0, 2000) + "\n  // ... truncated";
          scopeVars.set(key, {
            key,
            originalName: name,
            scope: scopeKey,
            type: "function_declaration",
            fingerprint: fp,
            fingerprintHash: fingerprintHash(fp),
            initType: null,
            code: snippet,
          });
        }
      }
    },
    VariableDeclarator(path: any) {
      const name: string | null =
        path.node.id && t.isIdentifier(path.node.id) ? path.node.id.name : null;
      if (name && isObfuscated(name)) {
        const scopeKey = scopeStack.join("/");
        const key = `${scopeKey}::${name}`;
        if (!scopeVars.has(key)) {
          const isFunc =
            t.isFunctionExpression(path.node.init) ||
            t.isArrowFunctionExpression(path.node.init);
          const fp = isFunc ? computeFunctionFingerprint(path.node) : {};
          let snippet = "";
          try {
            snippet = (generate as any)(path.node).code;
          } catch {
            /* */
          }
          if (snippet.length > 2000)
            snippet = snippet.slice(0, 2000) + "\n  // ... truncated";
          scopeVars.set(key, {
            key,
            originalName: name,
            scope: scopeKey,
            type: isFunc ? "function_variable" : "variable",
            fingerprint: fp,
            fingerprintHash: isFunc ? fingerprintHash(fp) : "",
            initType: path.node.init ? path.node.init.type : null,
            code: snippet,
          });
        }
      }
      if (path.node.id && !t.isIdentifier(path.node.id)) {
        const scopeKey = scopeStack.join("/");
        collectDestructuredIds(path.node.id, scopeKey);
      }
    },
    CatchClause(path: any) {
      const param = path.node.param;
      if (param && t.isIdentifier(param) && isObfuscated(param.name)) {
        const scopeKey = scopeStack.join("/");
        const key = `${scopeKey}::${param.name}`;
        if (!scopeVars.has(key)) {
          scopeVars.set(key, {
            key,
            originalName: param.name,
            scope: scopeKey,
            type: "parameter",
            fingerprint: {},
            fingerprintHash: "",
            initType: null,
            code: "",
          });
        }
      } else if (param && !t.isIdentifier(param)) {
        const scopeKey = scopeStack.join("/");
        collectDestructuredIds(param, scopeKey);
      }
    },
    Function: {
      enter(path: any) {
        const funcId = (path.node as t.FunctionDeclaration).id;
        const name: string = funcId ? funcId.name : "anon";
        scopeStack.push(name);
        for (const param of path.node.params) {
          if (t.isIdentifier(param)) {
            if (isObfuscated(param.name)) {
              const scopeKey = scopeStack.join("/");
              const key = `${scopeKey}::${param.name}`;
              if (!scopeVars.has(key)) {
                scopeVars.set(key, {
                  key,
                  originalName: param.name,
                  scope: scopeKey,
                  type: "parameter",
                  fingerprint: {},
                  fingerprintHash: "",
                  initType: null,
                  code: "",
                });
              }
            }
          } else if (t.isAssignmentPattern(param)) {
            if (t.isIdentifier(param.left) && isObfuscated(param.left.name)) {
              const scopeKey = scopeStack.join("/");
              const key = `${scopeKey}::${param.left.name}`;
              if (!scopeVars.has(key)) {
                scopeVars.set(key, {
                  key,
                  originalName: param.left.name,
                  scope: scopeKey,
                  type: "parameter",
                  fingerprint: {},
                  fingerprintHash: "",
                  initType: null,
                  code: "",
                });
              }
            } else if (!t.isIdentifier(param.left)) {
              const scopeKey = scopeStack.join("/");
              collectDestructuredIds(param.left, scopeKey);
            }
          } else if (
            t.isRestElement(param) &&
            t.isIdentifier(param.argument) &&
            isObfuscated(param.argument.name)
          ) {
            const scopeKey = scopeStack.join("/");
            const key = `${scopeKey}::${param.argument.name}`;
            if (!scopeVars.has(key)) {
              scopeVars.set(key, {
                key,
                originalName: param.argument.name,
                scope: scopeKey,
                type: "parameter",
                fingerprint: {},
                fingerprintHash: "",
                initType: null,
                code: "",
              });
            }
          } else if (!t.isIdentifier(param)) {
            const scopeKey = scopeStack.join("/");
            collectDestructuredIds(param, scopeKey);
          }
        }
      },
      exit() {
        scopeStack.pop();
      },
    },
  });
  return [...scopeVars.values()];
}

export function extractFunctionsWithContext(code: string): FunctionContext[] {
  const ast = parseCode(code);
  const functions: FunctionContext[] = [];
  const scopeStack: string[] = ["global"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (traverse as any)(ast, {
    FunctionDeclaration(path: any) {
      const name: string | null = path.node.id ? path.node.id.name : null;
      if (!name || !isObfuscated(name)) return;
      functions.push({
        originalName: name,
        scope: scopeStack.join("/"),
        type: "function_declaration",
        code: (generate as any)(path.node).code,
      });
    },
    VariableDeclarator(path: any) {
      const name: string | null =
        path.node.id && t.isIdentifier(path.node.id) ? path.node.id.name : null;
      if (!name || !isObfuscated(name)) return;
      if (
        !t.isFunctionExpression(path.node.init) &&
        !t.isArrowFunctionExpression(path.node.init)
      )
        return;
      functions.push({
        originalName: name,
        scope: scopeStack.join("/"),
        type: "function_variable",
        code: (generate as any)(path.node).code,
      });
    },
    Function: {
      enter(path: any) {
        const funcId = (path.node as t.FunctionDeclaration).id;
        scopeStack.push(funcId ? funcId.name : "anon");
      },
      exit() {
        scopeStack.pop();
      },
    },
  });
  return functions;
}

export function groupVariablesByFunction(
  variables: VariableInfo[],
): Map<string, FunctionGroup> {
  const groups = new Map<string, FunctionGroup>();
  for (const v of variables) {
    if (v.type === "function_declaration" || v.type === "function_variable") {
      if (!groups.has(v.key))
        groups.set(v.key, { funcVar: v, params: [], locals: [] });
      else groups.get(v.key)!.funcVar = v;
    } else if (v.type === "parameter") {
      const parts = v.scope.split("/");
      const parentKey = `${parts.slice(0, -1).join("/")}::${parts[parts.length - 1]}`;
      if (!groups.has(parentKey))
        groups.set(parentKey, {
          funcVar: null as unknown as VariableInfo,
          params: [],
          locals: [],
        });
      groups.get(parentKey)!.params.push(v);
    } else {
      const parts = v.scope.split("/");
      const parentKey = `${parts.slice(0, -1).join("/")}::${parts[parts.length - 1]}`;
      if (!groups.has(parentKey))
        groups.set(parentKey, {
          funcVar: null as unknown as VariableInfo,
          params: [],
          locals: [],
        });
      groups.get(parentKey)!.locals.push(v);
    }
  }
  return groups;
}

export function extractVarUsages(
  code: string,
  varOriginalNames: string[],
): Map<string, string[]> {
  const ast = parseCode(code);
  const wanted = new Set(varOriginalNames.filter(isObfuscated));
  const usages = new Map<string, string[]>();
  for (const n of wanted) usages.set(n, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (traverse as any)(ast, {
    Identifier(path: any) {
      const name: string = path.node.name;
      if (!wanted.has(name)) return;
      const parent = path.parent;
      const parentType = parent?.type;
      const isMemberObject =
        parentType === "MemberExpression" && parent.object === path.node;
      if (isMemberObject) return;
      const snippet = (generate as any)(
        path.parentPath?.isExpression?.() ? path.parentPath.node : path.node,
      ).code;
      let trimmed = snippet || name;
      if (trimmed.length > 100) trimmed = trimmed.slice(0, 100) + "...";
      const list = usages.get(name)!;
      if (list.length < 5 && !list.includes(trimmed)) list.push(trimmed);
    },
  });

  return usages;
}

export function applyRenames(
  code: string,
  mapping: Record<string, string>,
): string {
  const ast = parseCode(code);
  const scopeRenames = { ...mapping };
  const scopeStack: string[] = ["global"];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (traverse as any)(ast, {
    CatchClause(path: any) {
      const param = path.node.param;
      if (param && t.isIdentifier(param) && isObfuscated(param.name)) {
        const scopeKey = scopeStack.join("/");
        for (let i = scopeStack.length; i > 0; i--) {
          const tryKey = scopeStack.slice(0, i).join("/") + "::" + param.name;
          if (scopeRenames[tryKey]) {
            path.node.param = t.identifier(scopeRenames[tryKey]);
            break;
          }
        }
      }
    },
    Function: {
      enter(path: any) {
        const funcId = (path.node as t.FunctionDeclaration).id;
        scopeStack.push(funcId ? funcId.name : "anon");
      },
      exit() {
        scopeStack.pop();
      },
    },
    Identifier(path: any) {
      const name: string = path.node.name;
      if (!isObfuscated(name)) return;
      let newName: string | null = null;
      for (let i = scopeStack.length; i > 0; i--) {
        const tryKey = scopeStack.slice(0, i).join("/") + "::" + name;
        if (scopeRenames[tryKey]) {
          newName = scopeRenames[tryKey];
          break;
        }
      }
      if (!newName) {
        const fk = `global/anon::${name}`;
        if (scopeRenames[fk]) newName = scopeRenames[fk];
      }
      if (newName) path.node.name = newName;
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (generate as any)(ast, {
    compact: false,
    retainLines: false,
    comments: true,
  }).code;
}
