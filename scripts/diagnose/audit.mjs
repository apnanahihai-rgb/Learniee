#!/usr/bin/env node
/**
 * Learniee API-wiring audit.
 *
 * Finds broken frontend -> API wiring after a UI redesign, without a database,
 * a build, or any network access. Zero extra dependencies: it uses the
 * TypeScript compiler API that is already in the project's node_modules.
 *
 * Usage (run from the project root):
 *   node scripts/diagnose/audit.mjs                 # creates diagnostics/<timestamp>/
 *   node scripts/diagnose/audit.mjs --out <dir>     # write into an existing folder (run.ps1 does this)
 *   node scripts/diagnose/audit.mjs --compare       # NEW / FIXED: latest run vs the one before it
 *   node scripts/diagnose/audit.mjs --compare <dirA> <dirB>   # older run, newer run
 *
 * It reads source files only. It never reads .env files and never prints secrets.
 */

import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PH = "\u0001"; // placeholder for "some runtime value" inside a URL
const MAX_CANDIDATES = 12; // cap on URL variants from conditionals / unions
const MAX_RESOLVE_DEPTH = 8;
const SECTION_LINE_CAP = 200; // per section in audit.txt
const SUMMARY_LINE_CAP = 40;
const BATCH_SIZE = 64; // files read per batch
const DIAG_DIR = "diagnostics";
const RUN_DIR_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;

/** Routes that are expected to have no frontend caller (reported separately). */
const EXPECTED_UNUSED_PREFIXES = ["/api/cron", "/api/webhooks", "/api/auth"];

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];

const CATEGORIES = [
  "CALLS_TO_MISSING_ROUTE",
  "METHOD_MISMATCH",
  "BODY_FIELD_MISMATCH",
  "UNRESOLVED_CALLS",
  "INDIRECT_REFERENCE_NO_ROUTE",
  "UNUSED_ROUTES",
];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const root = process.cwd();

function argValue(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
}

if (argv.includes("--help") || argv.includes("-h")) {
  console.log(
    [
      "node scripts/diagnose/audit.mjs [--out <dir>] [--compare [dirA dirB]]",
      "Run from the project root. See the header of this file for details.",
    ].join("\n"),
  );
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** Forward-slash, root-relative path (stable across Windows/Linux). */
function rel(p) {
  return path.relative(root, p).split(path.sep).join("/");
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function timestampName(d = new Date()) {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_` +
    `${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`
  );
}

function truncate(s, n) {
  s = String(s).replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

/** Shows placeholders as [param] in anything printed. */
function show(s) {
  return String(s).split(PH).join("[param]");
}

function gitInfo() {
  const run = (args) => {
    try {
      return execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
        .toString()
        .trim();
    } catch {
      return null;
    }
  };
  const hash = run(["rev-parse", "--short", "HEAD"]);
  if (!hash) return "n/a";
  const dirty = run(["status", "--porcelain"]);
  return dirty ? `${hash}+dirty` : hash;
}

async function* walk(dir, skipDirs) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (e.name.startsWith(".") || e.name === "node_modules") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (skipDirs && skipDirs.has(full)) continue;
      yield* walk(full, skipDirs);
    } else if (e.isFile()) {
      yield full;
    }
  }
}

async function readInBatches(files, handler) {
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const texts = await Promise.all(batch.map((f) => fsp.readFile(f, "utf8").catch(() => null)));
    for (let j = 0; j < batch.length; j++) {
      if (texts[j] !== null) handler(batch[j], texts[j]);
    }
  }
}

// ---------------------------------------------------------------------------
// Compare mode (does not need TypeScript)
// ---------------------------------------------------------------------------

function listRunDirs() {
  const base = path.join(root, DIAG_DIR);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && RUN_DIR_RE.test(e.name))
    .map((e) => path.join(base, e.name))
    .filter((d) => fs.existsSync(path.join(d, "audit.json")))
    .sort();
}

function loadAudit(dir) {
  return JSON.parse(fs.readFileSync(path.join(dir, "audit.json"), "utf8"));
}

function findingKeys(audit) {
  const map = new Map();
  for (const cat of CATEGORIES) {
    if (cat === "UNUSED_ROUTES") continue; // info only, too noisy to diff
    for (const f of audit.findings?.[cat] ?? []) map.set(`${cat}|${f.key}`, { cat, ...f });
  }
  return map;
}

function diffRuns(prev, cur) {
  const a = findingKeys(prev);
  const b = findingKeys(cur);
  const added = [...b.entries()].filter(([k]) => !a.has(k)).map(([, v]) => v);
  const fixed = [...a.entries()].filter(([k]) => !b.has(k)).map(([, v]) => v);
  return { added, fixed };
}

function formatCompare(prevName, curName, diff, maxLines = Infinity) {
  const out = [`COMPARE  ${prevName}  ->  ${curName}`, `NEW: ${diff.added.length}   FIXED: ${diff.fixed.length}`];
  const section = (title, items) => {
    out.push("", `${title} (${items.length})`);
    for (const it of items) out.push(`  [${it.cat}] ${it.label}`);
  };
  if (diff.added.length) section("NEW problems", diff.added);
  if (diff.fixed.length) section("FIXED since previous run", diff.fixed);
  if (!diff.added.length && !diff.fixed.length) out.push("", "No change in findings.");
  return out.slice(0, maxLines);
}

if (argv.includes("--compare")) {
  const i = argv.indexOf("--compare");
  const explicit = argv.slice(i + 1).filter((x) => !x.startsWith("--"));
  let prevDir;
  let curDir;
  if (explicit.length >= 2) {
    [prevDir, curDir] = explicit.map((p) => path.resolve(root, p));
  } else {
    const runs = listRunDirs();
    if (runs.length < 2) {
      console.log("Need at least two runs in diagnostics/ to compare.");
      process.exit(0);
    }
    prevDir = runs[runs.length - 2];
    curDir = runs[runs.length - 1];
  }
  const diff = diffRuns(loadAudit(prevDir), loadAudit(curDir));
  console.log(formatCompare(path.basename(prevDir), path.basename(curDir), diff).join("\n"));
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Load the TypeScript compiler API from the project (no extra install)
// ---------------------------------------------------------------------------

let ts;
try {
  const req = createRequire(path.join(root, "package.json"));
  ts = req("typescript");
} catch {
  console.error(
    "Could not load 'typescript' from node_modules. Run this from the project root after `npm install`.",
  );
  process.exit(2);
}
const SK = ts.SyntaxKind;

// ---------------------------------------------------------------------------
// Part A - collect API routes
// ---------------------------------------------------------------------------

/** Parses src/app/api/<...>/route.ts into a URL pattern + segment descriptors. */
function routeFromFile(file) {
  const relPath = rel(file); // src/app/api/parent/x/[id]/route.ts
  const dir = path.posix.dirname(relPath).replace(/^src\/app/, ""); // /api/parent/x/[id]
  const segs = [];
  for (const raw of dir.split("/").filter(Boolean)) {
    if (/^\(.*\)$/.test(raw)) continue; // route group
    if (raw.startsWith("@")) continue; // parallel slot
    let m;
    if ((m = raw.match(/^\[\[\.\.\.(.+)\]\]$/))) segs.push({ kind: "optCatchAll", text: m[1] });
    else if ((m = raw.match(/^\[\.\.\.(.+)\]$/))) segs.push({ kind: "catchAll", text: m[1] });
    else if ((m = raw.match(/^\[(.+)\]$/))) segs.push({ kind: "dyn", text: m[1] });
    else segs.push({ kind: "static", text: raw });
  }
  const pattern =
    "/" +
    segs
      .map((s) =>
        s.kind === "dyn" ? `[${s.text}]` : s.kind === "catchAll" ? `[...${s.text}]` : s.kind === "optCatchAll" ? `[[...${s.text}]]` : s.text,
      )
      .join("/");
  return { file: relPath, pattern, segs };
}

function hasModifier(node, kind) {
  return !!node.modifiers?.some((m) => m.kind === kind);
}

/** Finds exported HTTP method handlers and the function node implementing each. */
function analyzeRouteExports(sf) {
  const methods = new Map(); // METHOD -> function-like node | null
  let methodsUnknown = false;
  const localFns = new Map(); // name -> function-like node

  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) localFns.set(st.name.text, st);
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && d.initializer && (ts.isArrowFunction(d.initializer) || ts.isFunctionExpression(d.initializer))) {
          localFns.set(d.name.text, d.initializer);
        }
      }
    }
  }

  for (const st of sf.statements) {
    if (ts.isFunctionDeclaration(st) && st.name && hasModifier(st, SK.ExportKeyword) && HTTP_METHODS.includes(st.name.text)) {
      methods.set(st.name.text, st);
    } else if (ts.isVariableStatement(st) && hasModifier(st, SK.ExportKeyword)) {
      for (const d of st.declarationList.declarations) {
        if (ts.isIdentifier(d.name) && HTTP_METHODS.includes(d.name.text)) {
          const init = d.initializer;
          methods.set(d.name.text, init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) ? init : null);
        }
      }
    } else if (ts.isExportDeclaration(st)) {
      if (!st.exportClause) methodsUnknown = true; // export * from "..."
      else if (ts.isNamedExports(st.exportClause)) {
        for (const el of st.exportClause.elements) {
          const exported = el.name.text;
          if (HTTP_METHODS.includes(exported)) {
            const local = (el.propertyName ?? el.name).text;
            methods.set(exported, st.moduleSpecifier ? null : (localFns.get(local) ?? null));
          }
        }
      }
    }
  }
  return { methods, methodsUnknown };
}

/** `x ?? {}` / `x || {}`: the value flows through, so keep following it. */
function isFallbackOperand(node) {
  const p = node.parent;
  return !!p && ts.isBinaryExpression(p) && p.left === node && (p.operatorToken.kind === SK.QuestionQuestionToken || p.operatorToken.kind === SK.BarBarToken);
}

function keysFromTypeNode(typeNode) {
  const keys = new Set();
  if (typeNode && ts.isTypeLiteralNode(typeNode)) {
    for (const m of typeNode.members) {
      if (ts.isPropertySignature(m) && m.name && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name))) keys.add(m.name.text);
    }
  }
  return keys;
}

function bindingKeys(pattern) {
  const keys = new Set();
  for (const el of pattern.elements) {
    if (ts.isBindingElement(el) && !el.dotDotDotToken) {
      const n = el.propertyName ?? el.name;
      if (ts.isIdentifier(n) || ts.isStringLiteral(n)) keys.add(n.text);
    }
  }
  return keys;
}

/**
 * Heuristic: which JSON body keys does this handler read?
 * Understands `const body = await req.json()`, `const { a, b } = await req.json()`,
 * `body.x`, `body["x"]`, `const { a } = body`, `as { a: string }` casts and simple aliases.
 * Anything else (body passed to a function, spread, returned) marks the result `opaque`.
 */
function analyzeBodyReads(fn) {
  const result = { keys: new Set(), opaque: false, usesJson: false, usesFormData: false };
  if (!fn || !fn.body) return result;
  const firstParam = fn.parameters?.[0];
  const reqName = firstParam && ts.isIdentifier(firstParam.name) ? firstParam.name.text : null;
  if (!reqName) return result;

  const bodyVars = new Set();

  const climb = (node) => {
    // Walk up through await / parens / casts / .catch(...) chains.
    let n = node;
    for (;;) {
      const p = n.parent;
      if (!p) break;
      if (ts.isAwaitExpression(p) || ts.isParenthesizedExpression(p) || ts.isNonNullExpression(p) || isFallbackOperand(n)) n = p;
      else if (ts.isAsExpression(p) || ts.isSatisfiesExpression?.(p)) {
        for (const k of keysFromTypeNode(p.type)) result.keys.add(k);
        n = p;
      } else if (ts.isPropertyAccessExpression(p) && p.expression === n && ts.isCallExpression(p.parent) && /^(catch|then)$/.test(p.name.text)) n = p.parent;
      else break;
    }
    return n;
  };

  const handleSink = (node) => {
    // `node` is the full expression whose value is the parsed body.
    const p = node.parent;
    if (p && ts.isVariableDeclaration(p) && p.initializer === node) {
      if (ts.isIdentifier(p.name)) bodyVars.add(p.name.text);
      else if (ts.isObjectBindingPattern(p.name)) for (const k of bindingKeys(p.name)) result.keys.add(k);
      return;
    }
    result.opaque = true;
  };

  const find = (node) => {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee.expression) && callee.expression.text === reqName) {
        if (callee.name.text === "json") {
          result.usesJson = true;
          handleSink(climb(node));
        } else if (callee.name.text === "formData") result.usesFormData = true;
      }
    }
    ts.forEachChild(node, find);
  };
  find(fn.body);

  // Follow reads of each body variable (and simple aliases of it).
  const seen = new Set();
  const scan = (name) => {
    if (seen.has(name)) return;
    seen.add(name);
    const visit = (node) => {
      if (ts.isIdentifier(node) && node.text === name) {
        const decl = node.parent && ts.isVariableDeclaration(node.parent) && node.parent.name === node;
        const isPropName = node.parent && ts.isPropertyAccessExpression(node.parent) && node.parent.name === node;
        const isShorthandKey = node.parent && ts.isPropertyAssignment(node.parent) && node.parent.name === node;
        if (!decl && !isPropName && !isShorthandKey) classifyUse(node);
      }
      ts.forEachChild(node, visit);
    };
    const classifyUse = (id) => {
      let n = id;
      while (n.parent && (ts.isParenthesizedExpression(n.parent) || ts.isNonNullExpression(n.parent) || ts.isAsExpression(n.parent) || isFallbackOperand(n))) {
        if (ts.isAsExpression(n.parent)) for (const k of keysFromTypeNode(n.parent.type)) result.keys.add(k);
        n = n.parent;
      }
      const p = n.parent;
      if (!p) return;
      if (ts.isPropertyAccessExpression(p) && p.expression === n) {
        if (!/^(hasOwnProperty|toString)$/.test(p.name.text)) result.keys.add(p.name.text);
      } else if (ts.isElementAccessExpression(p) && p.expression === n) {
        if (p.argumentExpression && ts.isStringLiteralLike(p.argumentExpression)) result.keys.add(p.argumentExpression.text);
        else result.opaque = true;
      } else if (ts.isVariableDeclaration(p) && p.initializer === n) {
        if (ts.isObjectBindingPattern(p.name)) for (const k of bindingKeys(p.name)) result.keys.add(k);
        else if (ts.isIdentifier(p.name)) scan(p.name.text); // alias
      } else if (ts.isTypeOfExpression(p) || ts.isPrefixUnaryExpression(p) || ts.isIfStatement(p)) {
        // type / null guards: ignore
      } else if (ts.isBinaryExpression(p) && /^(===|!==|==|!=|&&|\|\|)$/.test(p.operatorToken.getText?.() ?? "")) {
        // guards: ignore
      } else {
        result.opaque = true;
      }
    };
    visit(fn.body);
  };
  for (const v of [...bodyVars]) scan(v);

  return result;
}

// ---------------------------------------------------------------------------
// Part B - resolve frontend URLs / methods / bodies from the AST
// ---------------------------------------------------------------------------

/** Returns true when `node` is a function-like / block scope that can declare names. */
function scopeDeclares(scopeNode, name) {
  // Parameters (incl. defaults and destructured props with defaults)
  if (
    ts.isFunctionLike(scopeNode) &&
    scopeNode.parameters
  ) {
    for (const p of scopeNode.parameters) {
      if (ts.isIdentifier(p.name) && p.name.text === name) {
        return p.initializer ? { init: p.initializer } : { unknown: true };
      }
      if (ts.isObjectBindingPattern(p.name)) {
        for (const el of p.name.elements) {
          if (ts.isIdentifier(el.name) && el.name.text === name) {
            return el.initializer ? { init: el.initializer } : { unknown: true };
          }
        }
      }
    }
  }
  // Statements in the scope body
  let statements = null;
  if (ts.isSourceFile(scopeNode) || ts.isBlock(scopeNode) || ts.isModuleBlock(scopeNode)) statements = scopeNode.statements;
  else if (ts.isCaseClause(scopeNode) || ts.isDefaultClause(scopeNode)) statements = scopeNode.statements;
  if (statements) {
    for (const st of statements) {
      if (ts.isVariableStatement(st)) {
        for (const d of st.declarationList.declarations) {
          if (ts.isIdentifier(d.name) && d.name.text === name) return d.initializer ? { init: d.initializer } : { unknown: true };
          if (ts.isObjectBindingPattern(d.name) || ts.isArrayBindingPattern(d.name)) {
            const names = d.name.elements.filter((e) => ts.isBindingElement(e)).map((e) => e.name);
            if (names.some((n) => ts.isIdentifier(n) && n.text === name)) return { unknown: true };
          }
        }
      }
    }
  }
  return null;
}

/** Finds the declaration of identifier `id` by walking up the scope chain. */
function lookupDeclaration(id) {
  const name = id.text;
  let n = id.parent;
  while (n) {
    const hit = scopeDeclares(n, name);
    if (hit) return hit;
    n = n.parent;
  }
  return null;
}

/**
 * Resolves an expression to a list of candidate strings. Unknown runtime parts become PH.
 * `ctx.consumed` collects initializer nodes that were used, so the later literal scan
 * does not report them a second time.
 */
function resolveStrings(node, ctx, depth = 0) {
  if (!node || depth > MAX_RESOLVE_DEPTH) return [PH];
  switch (node.kind) {
    case SK.StringLiteral:
    case SK.NoSubstitutionTemplateLiteral:
      return [node.text];
    case SK.ParenthesizedExpression:
    case SK.AsExpression:
    case SK.NonNullExpression:
    case SK.SatisfiesExpression:
    case SK.TypeAssertionExpression:
      return resolveStrings(node.expression, ctx, depth + 1);
    case SK.TemplateExpression: {
      let acc = [node.head.text];
      for (const span of node.templateSpans) {
        const mid = resolveStrings(span.expression, ctx, depth + 1);
        acc = cross(acc, mid).map((s) => s + span.literal.text);
      }
      return acc.slice(0, MAX_CANDIDATES);
    }
    case SK.BinaryExpression: {
      const op = node.operatorToken.kind;
      if (op === SK.PlusToken) return cross(resolveStrings(node.left, ctx, depth + 1), resolveStrings(node.right, ctx, depth + 1));
      if (op === SK.BarBarToken || op === SK.QuestionQuestionToken) {
        return uniq([...resolveStrings(node.left, ctx, depth + 1), ...resolveStrings(node.right, ctx, depth + 1)]).slice(0, MAX_CANDIDATES);
      }
      return [PH];
    }
    case SK.ConditionalExpression:
      return uniq([...resolveStrings(node.whenTrue, ctx, depth + 1), ...resolveStrings(node.whenFalse, ctx, depth + 1)]).slice(0, MAX_CANDIDATES);
    case SK.Identifier: {
      if (node.text === "undefined") return [PH];
      const decl = lookupDeclaration(node);
      if (decl?.init) {
        ctx.consumed.push([decl.init.pos, decl.init.end]);
        return resolveStrings(decl.init, ctx, depth + 1);
      }
      return [PH];
    }
    case SK.PropertyAccessExpression: {
      // CONST_OBJ.key where CONST_OBJ is an object literal in this file
      const obj = findObjectLiteral(node.expression, ctx, depth + 1);
      if (obj) {
        const prop = obj.properties.find((p) => ts.isPropertyAssignment(p) && propName(p.name) === node.name.text);
        if (prop) return resolveStrings(prop.initializer, ctx, depth + 1);
      }
      return [PH];
    }
    default:
      return [PH]; // calls, element access, etc.
  }
}

function cross(a, b) {
  const out = [];
  for (const x of a) for (const y of b) {
    out.push(x + y);
    if (out.length >= MAX_CANDIDATES) return out;
  }
  return out;
}

function uniq(arr) {
  return [...new Set(arr)];
}

function propName(n) {
  return ts.isIdentifier(n) || ts.isStringLiteral(n) || ts.isNumericLiteral(n) ? n.text : null;
}

/** Resolves an expression to an object literal if it is one (directly or via a const). */
function findObjectLiteral(node, ctx, depth = 0) {
  if (!node || depth > MAX_RESOLVE_DEPTH) return null;
  if (ts.isObjectLiteralExpression(node)) return node;
  if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression?.(node)) {
    return findObjectLiteral(node.expression, ctx, depth + 1);
  }
  if (ts.isIdentifier(node)) {
    const decl = lookupDeclaration(node);
    if (decl?.init) {
      ctx.consumed.push([decl.init.pos, decl.init.end]);
      return findObjectLiteral(decl.init, ctx, depth + 1);
    }
  }
  return null;
}

/** Top-level keys of an object literal; `spread` is true when keys are not fully known. */
function objectKeys(obj, ctx, depth = 0) {
  const keys = new Set();
  let spread = false;
  for (const p of obj.properties) {
    if (ts.isPropertyAssignment(p) || ts.isMethodDeclaration(p)) {
      const k = propName(p.name);
      if (k) keys.add(k);
      else spread = true; // computed key
    } else if (ts.isShorthandPropertyAssignment(p)) keys.add(p.name.text);
    else if (ts.isSpreadAssignment(p)) {
      const inner = depth < 3 ? findObjectLiteral(p.expression, ctx, depth + 1) : null;
      if (inner) {
        const r = objectKeys(inner, ctx, depth + 1);
        for (const k of r.keys) keys.add(k);
        spread = spread || r.spread;
      } else spread = true;
    }
  }
  return { keys, spread };
}

/** Reads method + body keys out of the fetch init argument. */
function readInit(initNode, ctx) {
  const info = { methods: ["GET"], methodKnown: true, bodyKeys: null, bodySpread: false, hasBody: false };
  if (!initNode) return info;
  const obj = findObjectLiteral(initNode, ctx);
  if (!obj) {
    info.methodKnown = false;
    info.methods = [];
    return info;
  }
  let sawMethod = false;
  let sawSpread = false;
  for (const p of obj.properties) {
    if (ts.isSpreadAssignment(p)) sawSpread = true;
    const name = (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) && propName(p.name);
    if (name === "method") {
      sawMethod = true;
      const vals = ts.isShorthandPropertyAssignment(p) ? [PH] : resolveStrings(p.initializer, ctx);
      const known = vals.filter((v) => !v.includes(PH)).map((v) => v.toUpperCase());
      info.methods = known;
      info.methodKnown = known.length > 0 && known.length === vals.length;
    } else if (name === "body" && ts.isPropertyAssignment(p)) {
      info.hasBody = true;
      let e = p.initializer;
      while (ts.isParenthesizedExpression(e) || ts.isAsExpression(e)) e = e.expression;
      if (ts.isCallExpression(e) && /JSON\.stringify$/.test(e.expression.getText()) && e.arguments[0]) {
        const bodyObj = findObjectLiteral(e.arguments[0], ctx);
        if (bodyObj) {
          const r = objectKeys(bodyObj, ctx);
          info.bodyKeys = r.keys;
          info.bodySpread = r.spread;
        }
      }
    }
  }
  if (!sawMethod) {
    if (sawSpread) {
      info.methodKnown = false; // method might come from the spread options
      info.methods = [];
    } else info.methods = ["GET"];
  }
  return info;
}

// ---------------------------------------------------------------------------
// URL parsing + matching
// ---------------------------------------------------------------------------

function classifyCandidate(c) {
  if (c.startsWith(PH)) return "unresolved";
  if (/^https?:\/\//i.test(c)) return "external";
  if (c === "/api" || c.startsWith("/api/") || c.startsWith("/api?")) return "api";
  return "other";
}

function parseUrl(candidate) {
  let p = candidate;
  const q = p.search(/[?#]/);
  if (q >= 0) p = p.slice(0, q);
  p = p.replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  const segs = p.split("/").filter(Boolean).map((s) => {
    if (s === PH) return { kind: "wild" };
    if (s.includes(PH)) {
      const re = new RegExp("^" + s.split(PH).map(escapeRe).join(".*") + "$");
      return { kind: "partial", re, text: s };
    }
    return { kind: "static", text: s };
  });
  return { display: show(p) || "/", segs, hasUnknown: segs.some((s) => s.kind !== "static") };
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function segMatches(callSeg, routeSeg) {
  if (callSeg.kind === "wild") return true;
  if (routeSeg.kind === "dyn") return true;
  if (callSeg.kind === "static") return callSeg.text === routeSeg.text;
  return callSeg.re.test(routeSeg.text); // partial vs static route segment
}

function routeMatches(callSegs, routeSegs) {
  let i = 0;
  for (; i < routeSegs.length; i++) {
    const rs = routeSegs[i];
    if (rs.kind === "catchAll") return callSegs.length - i >= 1;
    if (rs.kind === "optCatchAll") return callSegs.length - i >= 0;
    if (i >= callSegs.length) return false;
    if (!segMatches(callSegs[i], rs)) return false;
  }
  return callSegs.length === routeSegs.length;
}

function specificity(route) {
  return route.segs.filter((s) => s.kind === "static").length;
}

function matchRoutes(parsed, routes) {
  const hits = routes.filter((r) => routeMatches(parsed.segs, r.segs));
  if (hits.length <= 1 || parsed.hasUnknown) return hits;
  const best = Math.max(...hits.map(specificity));
  return hits.filter((r) => specificity(r) === best); // Next prefers the static route
}

/** Up to 2 routes that look closest to an unmatched URL (for "did you mean"). */
function suggestRoutes(parsed, routes) {
  const scored = routes.map((r) => {
    let score = 0;
    const n = Math.min(parsed.segs.length, r.segs.length);
    for (let i = 0; i < n; i++) {
      if (segMatches(parsed.segs[i], r.segs[i])) score += parsed.segs[i].kind === "static" ? 2 : 1;
    }
    // reward matching from the end too (redesigns often move the prefix)
    for (let i = 1; i <= n; i++) {
      const a = parsed.segs[parsed.segs.length - i];
      const b = r.segs[r.segs.length - i];
      if (a.kind === "static" && b.kind === "static" && a.text === b.text) score += 1.5;
    }
    score -= Math.abs(parsed.segs.length - r.segs.length) * 0.75;
    return { r, score };
  });
  return scored
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((x) => x.r.pattern);
}

// ---------------------------------------------------------------------------
// Frontend scan
// ---------------------------------------------------------------------------

const CALL_HINT_RE = /fetch|EventSource|sendBeacon|axios|\/api\//;

function isTestFile(p) {
  return /\.(test|spec)\.[tj]sx?$/.test(p) || /(^|\/)__tests__(\/|$)/.test(p) || /\.d\.ts$/.test(p);
}

function lineOf(sf, node) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

/** Decides whether a call expression is an HTTP call, and returns its parts. */
function detectHttpCall(node) {
  const callee = node.expression;
  const args = node.arguments;
  const text = callee.getText();
  // fetch(url, init) / window.fetch / globalThis.fetch / self.fetch
  if ((ts.isIdentifier(callee) && callee.text === "fetch") || /^(window|globalThis|self)\.fetch$/.test(text)) {
    return { kind: "fetch", urlNode: args[0], initNode: args[1] };
  }
  // new EventSource(url) is handled in the NewExpression branch
  // navigator.sendBeacon(url, data) -> POST
  if (/^(window\.)?navigator\.sendBeacon$/.test(text)) return { kind: "beacon", urlNode: args[0], forcedMethod: "POST" };
  // axios(...) / axios.get(url) / axios.post(url, body)
  if (ts.isIdentifier(callee) && callee.text === "axios") return { kind: "axios", urlNode: args[0], initNode: null };
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && /^(axios|ky|http|apiClient)$/.test(callee.expression.text)) {
    const m = callee.name.text.toUpperCase();
    if (HTTP_METHODS.includes(m)) return { kind: "axios", urlNode: args[0], forcedMethod: m, bodyNode: args[1] };
  }
  return null;
}

function scanFrontendFile(sf, file, state) {
  const consumed = [];
  const ctx = { consumed };
  const fileRel = rel(file);
  const serverOnly = /import\s+["']server-only["']/.test(sf.text);
  state.stats.filesScanned++;

  // Phase 1: direct HTTP calls
  const visitCalls = (node) => {
    let call = null;
    if (ts.isCallExpression(node)) call = detectHttpCall(node);
    else if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === "EventSource") {
      call = { kind: "eventsource", urlNode: node.arguments?.[0], forcedMethod: "GET" };
    }
    if (call && call.urlNode) {
      consumed.push([call.urlNode.pos, call.urlNode.end]);
      const candidates = resolveStrings(call.urlNode, ctx);
      let init = { methods: ["GET"], methodKnown: true, bodyKeys: null, bodySpread: false, hasBody: false };
      if (call.initNode) init = readInit(call.initNode, ctx);
      if (call.forcedMethod) {
        init.methods = [call.forcedMethod];
        init.methodKnown = true;
      }
      if (call.bodyNode) {
        const bo = findObjectLiteral(call.bodyNode, ctx);
        if (bo) {
          const r = objectKeys(bo, ctx);
          init.bodyKeys = r.keys;
          init.bodySpread = r.spread;
        }
      }
      state.rawCalls.push({
        file: fileRel,
        line: lineOf(sf, node),
        kind: call.kind,
        expr: truncate(call.urlNode.getText(sf), 90),
        candidates,
        method: init,
        serverOnly,
      });
    }
    ts.forEachChild(node, visitCalls);
  };
  visitCalls(sf);

  // Phase 2: "/api/..." literals not consumed by a direct call (hrefs, constants, hook arguments)
  const isConsumed = (n) => consumed.some(([a, b]) => n.pos >= a && n.end <= b);
  const visitLiterals = (node) => {
    const isLit = ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
    const isTpl = ts.isTemplateExpression(node);
    if ((isLit || isTpl) && !isConsumed(node)) {
      const startsApi = isLit ? node.text.startsWith("/api/") : node.head.text.startsWith("/api/");
      if (startsApi && !isCheckContext(node)) {
        const cands = resolveStrings(node, { consumed: [] }).filter((c) => classifyCandidate(c) === "api");
        if (cands.length && !cands.some((c) => c.endsWith("/") || /[*:]/.test(c))) { // skip prefixes and matcher patterns like /api/:path*
          state.rawIndirect.push({ file: fileRel, line: lineOf(sf, node), expr: truncate(node.getText(sf), 90), candidates: cands });
        }
      }
    }
    ts.forEachChild(node, visitLiterals);
  };
  visitLiterals(sf);
}

/** True for `pathname.startsWith("/api/")`, `=== "/api/x"` etc. - path checks, not calls. */
function isCheckContext(node) {
  const p = node.parent;
  if (!p) return false;
  if (ts.isCallExpression(p) && ts.isPropertyAccessExpression(p.expression) && /^(startsWith|endsWith|includes|match|test|indexOf)$/.test(p.expression.name.text)) return true;
  if (ts.isBinaryExpression(p) && /^(===|!==|==|!=)$/.test(p.operatorToken.getText())) return true;
  if (ts.isCaseClause(p)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Main analysis
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = new Date();
  const srcDir = path.join(root, "src");
  if (!fs.existsSync(srcDir)) {
    console.error("src/ not found. Run this from the project root.");
    process.exit(2);
  }

  // Decide where the run goes (and find the previous run before we create anything).
  const priorRuns = listRunDirs();
  const outArg = argValue("--out");
  const outDir = outArg ? path.resolve(root, outArg) : path.join(root, DIAG_DIR, timestampName(startedAt));
  fs.mkdirSync(outDir, { recursive: true });
  const prevDir = priorRuns.filter((d) => path.resolve(d) !== path.resolve(outDir)).pop() ?? null;

  const state = { rawCalls: [], rawIndirect: [], stats: { filesScanned: 0 } };

  // ---- A. routes
  const apiRoot = path.join(srcDir, "app", "api");
  const routeFiles = [];
  for await (const f of walk(apiRoot)) if (/(^|[\\/])route\.(ts|tsx|js|mjs)$/.test(f)) routeFiles.push(f);
  routeFiles.sort();

  const routes = [];
  await readInBatches(routeFiles, (file, text) => {
    const r = routeFromFile(file);
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const { methods, methodsUnknown } = analyzeRouteExports(sf);
    r.methods = [...methods.keys()].sort();
    r.methodsUnknown = methodsUnknown;
    r.body = {};
    for (const [m, fn] of methods) {
      if (["POST", "PUT", "PATCH", "DELETE"].includes(m) && fn) {
        const b = analyzeBodyReads(fn);
        if (b.usesJson || b.usesFormData) {
          r.body[m] = { keys: [...b.keys].sort(), opaque: b.opaque, formData: b.usesFormData };
        }
      }
    }
    r.used = 0;
    routes.push(r);
  });
  routes.sort((a, b) => a.pattern.localeCompare(b.pattern));

  // ---- B. frontend calls (stream the file list in batches)
  const files = [];
  for await (const f of walk(srcDir, new Set([apiRoot]))) {
    if (/\.(ts|tsx)$/.test(f) && !isTestFile(rel(f))) files.push(f);
  }
  files.sort();
  await readInBatches(files, (file, text) => {
    if (!CALL_HINT_RE.test(text)) return;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    scanFrontendFile(sf, file, state);
  });

  // ---- C. match
  const findings = Object.fromEntries(CATEGORIES.map((c) => [c, []]));
  const calls = [];
  const seenKeys = new Map(); // key -> count, to keep keys unique

  const uniqueKey = (base) => {
    const n = (seenKeys.get(base) ?? 0) + 1;
    seenKeys.set(base, n);
    return n === 1 ? base : `${base}#${n}`;
  };

  let externalOrOther = 0;
  let externalCalls = 0;

  for (const c of state.rawCalls) {
    const kinds = c.candidates.map(classifyCandidate);
    const apiCands = c.candidates.filter((_, i) => kinds[i] === "api");

    if (apiCands.length === 0) {
      if (kinds.every((k) => k === "external")) {
        externalCalls++;
      } else if (kinds.some((k) => k === "unresolved")) {
        findings.UNRESOLVED_CALLS.push({
          key: uniqueKey(`${c.file}|${c.expr}`),
          label: `${c.file}:${c.line}  ${c.expr}${c.serverOnly ? "  (server-only file)" : ""}`,
          file: c.file,
          line: c.line,
          expr: c.expr,
          serverOnly: c.serverOnly,
        });
      } else externalOrOther++;
      continue;
    }

    const methods = c.method.methodKnown ? c.method.methods : ["UNKNOWN"];
    for (const cand of uniq(apiCands)) {
      const parsed = parseUrl(cand);
      const matched = matchRoutes(parsed, routes);
      for (const m of matched) m.used++;
      const methodLabel = methods.join("|");
      const entry = {
        url: parsed.display,
        method: methodLabel,
        file: c.file,
        line: c.line,
        status: "ok",
        matched: matched.map((r) => r.pattern),
      };

      if (matched.length === 0) {
        entry.status = "missing-route";
        const suggest = suggestRoutes(parsed, routes);
        findings.CALLS_TO_MISSING_ROUTE.push({
          key: uniqueKey(`${methodLabel}|${parsed.display}|${c.file}`),
          label: `${methodLabel} ${parsed.display}  <- ${c.file}:${c.line}` + (suggest.length ? `  (closest: ${suggest.join(", ")})` : ""),
          method: methodLabel,
          url: parsed.display,
          file: c.file,
          line: c.line,
          suggest,
        });
      } else if (c.method.methodKnown) {
        for (const m of methods) {
          if (m === "OPTIONS") continue;
          const supported = (r) => r.methodsUnknown || r.methods.includes(m) || (m === "HEAD" && r.methods.includes("GET"));
          if (!matched.some(supported)) {
            entry.status = "method-mismatch";
            findings.METHOD_MISMATCH.push({
              key: uniqueKey(`${m}|${parsed.display}|${c.file}`),
              label: `${m} ${parsed.display}  <- ${c.file}:${c.line}  (route exports: ${matched.map((r) => `${r.pattern} [${r.methods.join(",") || "none"}]`).join("; ")})`,
              method: m,
              url: parsed.display,
              file: c.file,
              line: c.line,
              routeMethods: matched.map((r) => ({ route: r.pattern, methods: r.methods })),
            });
          }
        }
      }

      // 5. body field heuristic: one method, one clear route, inline object body
      if (
        entry.status === "ok" &&
        c.method.methodKnown &&
        methods.length === 1 &&
        ["POST", "PUT", "PATCH"].includes(methods[0]) &&
        c.method.bodyKeys &&
        !c.method.bodySpread &&
        matched.length === 1
      ) {
        const info = matched[0].body[methods[0]];
        if (info && !info.formData && (info.keys.length > 0)) {
          const sent = c.method.bodyKeys;
          const read = new Set(info.keys);
          const notSent = info.keys.filter((k) => !sent.has(k));
          const extra = info.opaque ? [] : [...sent].filter((k) => !read.has(k));
          if (notSent.length || extra.length) {
            findings.BODY_FIELD_MISMATCH.push({
              key: uniqueKey(`${methods[0]}|${parsed.display}|${c.file}`),
              label:
                `${methods[0]} ${parsed.display}  <- ${c.file}:${c.line}` +
                (notSent.length ? `  route reads but UI does not send: ${notSent.join(", ")}` : "") +
                (extra.length ? `  UI sends but route never reads: ${extra.join(", ")}` : ""),
              method: methods[0],
              url: parsed.display,
              file: c.file,
              line: c.line,
              routeReadsNotSent: notSent,
              sentNotRead: extra,
              routeOpaque: info.opaque,
            });
          }
        }
      }
      calls.push(entry);
    }
  }

  // Indirect references: literal "/api/..." strings that are not direct calls.
  for (const ref of state.rawIndirect) {
    for (const cand of uniq(ref.candidates)) {
      const parsed = parseUrl(cand);
      const matched = matchRoutes(parsed, routes);
      for (const m of matched) m.used++;
      // A bare prefix such as "/api/parent/class-sessions" (used for path building or
      // realtime maps) is not a real URL; skip it when longer routes start with it.
      const isPrefixOnly = !parsed.hasUnknown && routes.some((r) => r.segs.length > parsed.segs.length && parsed.segs.every((ps, i) => segMatches(ps, r.segs[i])));
      if (matched.length === 0 && !isPrefixOnly) {
        const suggest = suggestRoutes(parsed, routes);
        findings.INDIRECT_REFERENCE_NO_ROUTE.push({
          key: uniqueKey(`${parsed.display}|${ref.file}`),
          label: `${parsed.display}  <- ${ref.file}:${ref.line}` + (suggest.length ? `  (closest: ${suggest.join(", ")})` : ""),
          url: parsed.display,
          file: ref.file,
          line: ref.line,
          suggest,
        });
      }
    }
  }

  for (const r of routes) {
    if (r.used === 0) {
      const expected = EXPECTED_UNUSED_PREFIXES.some((p) => r.pattern === p || r.pattern.startsWith(p + "/"));
      findings.UNUSED_ROUTES.push({
        key: r.pattern,
        label: `${r.pattern}  [${r.methods.join(",") || "?"}]${expected ? "  (expected: cron/webhook/auth)" : ""}  ${r.file}`,
        route: r.pattern,
        methods: r.methods,
        file: r.file,
        expected,
      });
    }
  }
  // real problems first, expected ones last
  findings.UNUSED_ROUTES.sort((a, b) => Number(a.expected) - Number(b.expected) || a.route.localeCompare(b.route));
  findings.UNRESOLVED_CALLS.sort((a, b) => Number(a.serverOnly) - Number(b.serverOnly) || a.file.localeCompare(b.file) || a.line - b.line);

  // ---- build info + build error excerpt (written by run.ps1; optional)
  let build = { status: "n/a", exitCode: null, durationSec: null };
  const buildJson = path.join(outDir, "build.json");
  if (fs.existsSync(buildJson)) {
    try {
      const b = JSON.parse(fs.readFileSync(buildJson, "utf8"));
      build = {
        status: b.skipped ? "SKIPPED" : b.exitCode === 0 ? "OK" : `FAILED(${b.exitCode})`,
        exitCode: b.exitCode,
        durationSec: b.durationSec,
        usedEnvTest: !!b.usedEnvTest,
      };
    } catch {
      /* ignore a malformed build.json */
    }
  }
  const buildErrors = [];
  const buildTxt = path.join(outDir, "build.txt");
  if (fs.existsSync(buildTxt) && build.status.startsWith("FAILED")) {
    const lines = fs.readFileSync(buildTxt, "utf8").split(/\r?\n/);
    const re = /(Failed to compile|Type error|Module not found|Can't resolve|Error:|error TS\d+|Build error)/i;
    for (let i = 0; i < lines.length && buildErrors.length < 25; i++) {
      if (re.test(lines[i])) buildErrors.push(truncate(lines[i], 200));
    }
  }

  // ---- counts
  const counts = {
    routes: routes.length,
    calls: calls.length,
    CALLS_TO_MISSING_ROUTE: findings.CALLS_TO_MISSING_ROUTE.length,
    METHOD_MISMATCH: findings.METHOD_MISMATCH.length,
    BODY_FIELD_MISMATCH: findings.BODY_FIELD_MISMATCH.length,
    UNRESOLVED_CALLS: findings.UNRESOLVED_CALLS.length,
    INDIRECT_REFERENCE_NO_ROUTE: findings.INDIRECT_REFERENCE_NO_ROUTE.length,
    UNUSED_ROUTES: findings.UNUSED_ROUTES.length,
    UNUSED_ROUTES_UNEXPECTED: findings.UNUSED_ROUTES.filter((u) => !u.expected).length,
  };

  const commit = gitInfo();
  const audit = {
    meta: {
      timestamp: path.basename(outDir),
      generatedAt: startedAt.toISOString(),
      commit,
      node: process.version,
      filesScanned: state.stats.filesScanned,
      externalCalls,
      otherInternalCalls: externalOrOther,
    },
    counts,
    build,
    routes: routes.map((r) => ({ pattern: r.pattern, file: r.file, methods: r.methods, methodsUnknown: r.methodsUnknown, callers: r.used, bodyReads: r.body })),
    calls,
    findings,
    buildErrors,
  };

  // ---- compare with previous run
  let diff = null;
  if (prevDir) {
    try {
      diff = diffRuns(loadAudit(prevDir), audit);
      audit.compare = { previous: path.basename(prevDir), added: diff.added.length, fixed: diff.fixed.length };
    } catch {
      /* previous audit unreadable: skip */
    }
  }

  // ---- write outputs
  fs.writeFileSync(path.join(outDir, "audit.json"), JSON.stringify(audit, null, 2));
  fs.writeFileSync(path.join(outDir, "audit.txt"), renderReport(audit));
  fs.writeFileSync(path.join(outDir, "SUMMARY.txt"), renderSummary(audit, diff).join("\n") + "\n");
  if (diff) {
    fs.writeFileSync(path.join(outDir, "compare.txt"), formatCompare(audit.compare.previous, audit.meta.timestamp, diff).join("\n") + "\n");
  }
  appendHistory(audit);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const SECTION_TITLES = {
  CALLS_TO_MISSING_ROUTE: "1. CALLS_TO_MISSING_ROUTE - UI calls a URL that no route file serves",
  METHOD_MISMATCH: "2. METHOD_MISMATCH - route exists but does not export that HTTP method",
  UNUSED_ROUTES: "3. UNUSED_ROUTES (info) - no frontend code references these routes",
  UNRESOLVED_CALLS: "4. UNRESOLVED_CALLS - URL could not be worked out statically (check by hand)",
  BODY_FIELD_MISMATCH: "5. BODY_FIELD_MISMATCH (heuristic) - JSON body keys differ between UI and route",
  INDIRECT_REFERENCE_NO_ROUTE: "6. INDIRECT_REFERENCE_NO_ROUTE (low confidence) - '/api/...' strings not used in a direct call",
};

function section(title, items) {
  const lines = [title, "-".repeat(Math.min(title.length, 100))];
  if (!items.length) lines.push("  none");
  for (const it of items.slice(0, SECTION_LINE_CAP - 3)) lines.push("  " + it.label);
  if (items.length > SECTION_LINE_CAP - 3) lines.push(`  ... ${items.length - (SECTION_LINE_CAP - 3)} more (see audit.json)`);
  return lines;
}

function renderReport(a) {
  const out = [];
  out.push("LEARNIEE API WIRING AUDIT");
  out.push(`Run: ${a.meta.timestamp}   Commit: ${a.meta.commit}   Build: ${a.build.status}`);
  out.push(`Routes: ${a.counts.routes}   Frontend calls matched: ${a.counts.calls}   Files scanned: ${a.meta.filesScanned}`);
  out.push("");
  if (a.buildErrors.length) {
    out.push(...section("0. BUILD_ERRORS (from build.txt)", a.buildErrors.map((l) => ({ label: l }))), "");
  }
  if (a.findings.UNRESOLVED_CALLS.length) {
    out.push("NOTE: some calls are unresolved (URL passed in from another file), so a few UNUSED_ROUTES may be false positives.", "");
  }
  for (const cat of ["CALLS_TO_MISSING_ROUTE", "METHOD_MISMATCH", "UNUSED_ROUTES", "UNRESOLVED_CALLS", "BODY_FIELD_MISMATCH", "INDIRECT_REFERENCE_NO_ROUTE"]) {
    out.push(...section(SECTION_TITLES[cat], a.findings[cat]), "");
  }
  return out.join("\n") + "\n";
}

function renderSummary(a, diff) {
  const c = a.counts;
  const lines = [];
  lines.push(`AUDIT ${a.meta.timestamp}  commit ${a.meta.commit}  build ${a.build.status}${a.build.durationSec != null ? ` (${a.build.durationSec}s)` : ""}`);
  lines.push(`routes ${c.routes} | calls ${c.calls} | files ${a.meta.filesScanned}`);
  lines.push("");
  lines.push(`CALLS_TO_MISSING_ROUTE ........ ${c.CALLS_TO_MISSING_ROUTE}`);
  lines.push(`METHOD_MISMATCH ............... ${c.METHOD_MISMATCH}`);
  lines.push(`BODY_FIELD_MISMATCH (heur.) ... ${c.BODY_FIELD_MISMATCH}`);
  lines.push(`UNRESOLVED_CALLS .............. ${c.UNRESOLVED_CALLS}`);
  lines.push(`INDIRECT_REF_NO_ROUTE (low) ... ${c.INDIRECT_REFERENCE_NO_ROUTE}`);
  lines.push(`UNUSED_ROUTES (info) .......... ${c.UNUSED_ROUTES} (${c.UNUSED_ROUTES_UNEXPECTED} not cron/webhook/auth)`);
  if (diff) lines.push(`vs ${a.compare.previous}: NEW ${diff.added.length}, FIXED ${diff.fixed.length}`);
  else lines.push("vs previous: no earlier run to compare");
  lines.push("");

  // Top problems: build errors, then the hard failures, then heuristics.
  const top = [];
  for (const l of a.buildErrors.slice(0, 3)) top.push(`[BUILD] ${l}`);
  const order = ["CALLS_TO_MISSING_ROUTE", "METHOD_MISMATCH", "BODY_FIELD_MISMATCH", "INDIRECT_REFERENCE_NO_ROUTE", "UNRESOLVED_CALLS"];
  const tag = { CALLS_TO_MISSING_ROUTE: "MISSING", METHOD_MISMATCH: "METHOD", BODY_FIELD_MISMATCH: "BODY", INDIRECT_REFERENCE_NO_ROUTE: "INDIRECT", UNRESOLVED_CALLS: "UNRESOLVED" };
  for (const cat of order) {
    for (const f of a.findings[cat]) {
      if (cat === "UNRESOLVED_CALLS" && f.serverOnly) continue;
      top.push(`[${tag[cat]}] ${f.label}`);
    }
  }
  lines.push(top.length ? "TOP PROBLEMS" : "TOP PROBLEMS: none found");
  const room = SUMMARY_LINE_CAP - lines.length;
  for (const t of top.slice(0, Math.min(10, Math.max(room, 0)))) lines.push("  " + truncate(t, 150));
  return lines.slice(0, SUMMARY_LINE_CAP);
}

function appendHistory(a) {
  const csvPath = path.join(root, DIAG_DIR, "history.csv");
  const header = "timestamp,commit,routes,calls,missing_route,method_mismatch,body_mismatch,unresolved,indirect_no_route,unused_routes,build\n";
  const c = a.counts;
  const row =
    [a.meta.timestamp, a.meta.commit, c.routes, c.calls, c.CALLS_TO_MISSING_ROUTE, c.METHOD_MISMATCH, c.BODY_FIELD_MISMATCH, c.UNRESOLVED_CALLS, c.INDIRECT_REFERENCE_NO_ROUTE, c.UNUSED_ROUTES, a.build.status]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",") + "\n";
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  if (!fs.existsSync(csvPath)) fs.writeFileSync(csvPath, header);
  fs.appendFileSync(csvPath, row);
}

main().catch((err) => {
  console.error("Audit failed:", err?.stack || err);
  process.exit(2);
});
