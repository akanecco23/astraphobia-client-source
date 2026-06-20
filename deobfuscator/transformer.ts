import type { TransformsFile, TransformEntry, LLMConfig } from "./types.js";
import { LLMClient, batchConcurrent } from "./llm.js";
import { parseCode } from "./ast-utils.js";
import _generate from "@babel/generator";
import _traverse from "@babel/traverse";
import * as t from "@babel/types";
import { log } from "./logger.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const traverse = (_traverse as any).default ?? _traverse;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const generate = (_generate as any).default ?? _generate;

export function applyTransforms(
  code: string,
  transforms: TransformsFile,
): string {
  let result = code;

  for (const transform of transforms.transforms) {
    switch (transform.type) {
      case "unwrap_iife":
        result = unwrapIIFE(result);
        break;
      case "hoist_declarations":
        result = hoistDeclarations(result);
        break;
      case "extract_constant":
        result = extractConstant(result, transform.params);
        break;
    }
  }

  return result;
}

function unwrapIIFE(code: string): string {
  const ast = parseCode(code);
  let changed = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (traverse as any)(ast, {
    ExpressionStatement(path: any) {
      const expr = path.node.expression;
      if (!t.isCallExpression(expr)) return;
      const callee = expr.callee;
      if (
        !t.isFunctionExpression(callee) &&
        !t.isArrowFunctionExpression(callee)
      )
        return;
      if (callee.params.length > 0) return;

      const body = callee.body;
      if (!t.isBlockStatement(body)) return;

      const parentPath = path.parentPath;
      if (!parentPath || !parentPath.isProgram()) {
        if (parentPath && parentPath.isSequenceExpression()) return;
      }

      const stmts = body.body.filter(
        (stmt: any) =>
          !(
            t.isExpressionStatement(stmt) &&
            t.isCallExpression(stmt.expression) &&
            t.isIdentifier(stmt.expression.callee) &&
            stmt.expression.callee.name === "arguments"
          ),
      );

      if (parentPath && parentPath.isProgram()) {
        path.replaceWithMultiple(stmts);
        changed = true;
      }
    },
  });

  if (!changed) return code;
  return (generate as any)(ast, {
    compact: false,
    retainLines: false,
    comments: true,
  }).code;
}

function hoistDeclarations(code: string): string {
  const ast = parseCode(code);

  const hoisted: t.Statement[] = [];
  const remaining: t.Statement[] = [];

  for (const stmt of ast.program.body) {
    if (t.isVariableDeclaration(stmt) && stmt.declarations.length > 1) {
      for (const decl of stmt.declarations) {
        hoisted.push(t.variableDeclaration(stmt.kind, [decl]));
      }
    } else if (t.isVariableDeclaration(stmt) || t.isFunctionDeclaration(stmt)) {
      hoisted.push(stmt);
    } else {
      remaining.push(stmt);
    }
  }

  ast.program.body = [...hoisted, ...remaining];
  return (generate as any)(ast, {
    compact: false,
    retainLines: false,
    comments: true,
  }).code;
}

function extractConstant(code: string, params: Record<string, string>): string {
  const { pattern, name } = params;
  if (!pattern || !name) return code;
  const re = new RegExp(pattern, "g");
  return code.replace(re, name);
}

export async function generateTransforms(
  code: string,
  llmConfig: LLMConfig & { enabled: boolean; concurrency: number },
): Promise<TransformsFile> {
  const result: TransformsFile = {
    _meta: {
      version: null,
      lastUpdated: null,
      description: "LLM-generated AST transforms. Edit to customize.",
    },
    transforms: [],
    moduleAssignments: {},
  };

  const ast = parseCode(code);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (traverse as any)(ast, {
    ExpressionStatement(path: any) {
      const expr = path.node.expression;
      if (
        t.isCallExpression(expr) &&
        (t.isFunctionExpression(expr.callee) ||
          t.isArrowFunctionExpression(expr.callee))
      ) {
        if (expr.callee.params.length === 0) {
          result.transforms.push({
            type: "unwrap_iife",
            description: "Unwrap immediately-invoked function expression",
            target: "program",
            params: {},
          });
        }
      }
    },
  });

  let hasMultiDecls = false;
  for (const stmt of ast.program.body) {
    if (t.isVariableDeclaration(stmt) && stmt.declarations.length > 1) {
      hasMultiDecls = true;
      break;
    }
  }
  if (hasMultiDecls) {
    result.transforms.push({
      type: "hoist_declarations",
      description: "Split multi-variable declarations into separate statements",
      target: "program",
      params: {},
    });
  }

  if (llmConfig.enabled) {
    const llm = new LLMClient(llmConfig);
    const snippet = code.slice(0, 4000);
    const suggested = await llm.suggestTransforms(snippet);
    for (const t of suggested) {
      if (
        !result.transforms.some(
          (e) => e.type === t.type && e.target === t.target,
        )
      ) {
        result.transforms.push(t);
      }
    }
  }

  result._meta.lastUpdated = new Date().toISOString();
  return result;
}
