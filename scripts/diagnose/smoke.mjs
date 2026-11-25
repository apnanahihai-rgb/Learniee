#!/usr/bin/env node
/**
 * Learniee browser smoke test (READ-ONLY).
 *
 * Opens the running app in a real browser, signs in as each role, visits every
 * main page (and the first detail page reachable from each list page) and records
 * what is broken: failed API calls, JS errors, error screens, blank pages and
 * unexpected redirects. It NEVER clicks anything and it BLOCKS every non-GET
 * request the pages try to send, so nothing can be created, changed or deleted.
 *
 * Usage (from the project root, app already running, e.g. `npm run dev`):
 *   node scripts/diagnose/smoke.mjs                      # all roles that have credentials
 *   node scripts/diagnose/smoke.mjs --roles parent,teacher
 *   node scripts/diagnose/smoke.mjs --only /parent/wallet   # re-check pages whose path contains this
 *   node scripts/diagnose/smoke.mjs --shots              # screenshot every non-OK page (contains page content!)
 *   node scripts/diagnose/smoke.mjs --headed             # watch the browser
 *   node scripts/diagnose/smoke.mjs --base http://localhost:3000 --settle 2500 --out <dir>
 *   node scripts/diagnose/smoke.mjs --compare            # NEW / FIXED: latest smoke run vs the one before it
 *
 * Credentials come ONLY from environment variables (never from files, never printed):
 *   SMOKE_PARENT_EMAIL / SMOKE_PARENT_PASSWORD, and the same for TEACHER, ADMIN,
 *   ACCOUNTS, IT, HR. A role without both variables is skipped. "public" (no login) always runs.
 *   (scripts/diagnose/smoke.ps1 asks for them and sets them for one run only.)
 *
 * Output: diagnostics/<timestamp>/smoke.json, smoke.txt, SMOKE_SUMMARY.txt
 *         + one line appended to diagnostics/smoke-history.csv
 */

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

// ---------------------------------------------------------------------------
// CLI + config
// ---------------------------------------------------------------------------

const root = process.cwd();
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const val = (n, d = null) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d;
};

const BASE = (val("--base", "http://localhost:3000") || "").replace(/\/+$/, "");
const SETTLE_MS = Number(val("--settle", "2500")); // wait after load so client fetches fire
const NAV_TIMEOUT_MS = 60_000; // dev servers compile each page on first visit
const DIAG_DIR = "diagnostics";
const RUN_DIR_RE = /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/;
const ONLY = val("--only");
const ROLE_FILTER = (val("--roles") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

// Pages per role. Dynamic pages are reached by FOLLOWING LINKS ("chains"):
// [startPage, regexForFirstLink, regexForNextLink...]
const ROLES = [
  {
    name: "public",
    login: false,
    pages: ["/", "/login", "/signup", "/forgot-password", "/courses", "/blog", "/privacy", "/terms", "/referral", "/refunds"],
    chains: [
      ["/courses", /^\/courses\/[^/]+$/],
      ["/blog", /^\/blog\/[^/]+$/],
    ],
  },
  {
    name: "parent",
    login: true,
    pages: [
      "/parent", "/parent/account", "/parent/blogs", "/parent/calendar", "/parent/chat", "/parent/complain",
      "/parent/courses", "/parent/enrollments", "/parent/free-demo", "/parent/homework-tests", "/parent/my-classes",
      "/parent/payments", "/parent/profile", "/parent/referral", "/parent/request-class", "/parent/reschedule",
      "/parent/resources", "/parent/settings", "/parent/students", "/parent/students/new", "/parent/wallet",
    ],
    chains: [
      ["/parent/courses", /^\/parent\/courses\/[^/]+$/],
      ["/parent/my-classes", /^\/parent\/my-classes\/[^/]+$/],
      ["/parent/students", /^\/parent\/students\/(?!new$)[^/]+$/],
      ["/parent/payments", /^\/parent\/payments\/[^/]+$/],
      ["/parent/chat", /^\/parent\/chat\/[^/]+$/],
      ["/parent/blogs", /^\/parent\/blogs\/[^/]+$/],
    ],
  },
  {
    name: "teacher",
    login: true,
    pages: [
      "/teacher", "/teacher/account", "/teacher/bank-account", "/teacher/blogs", "/teacher/blogs/new", "/teacher/blogs/read",
      "/teacher/calendar", "/teacher/certificates", "/teacher/chat", "/teacher/complain", "/teacher/course-management",
      "/teacher/course-management/new", "/teacher/courses", "/teacher/demo", "/teacher/earnings", "/teacher/enrollments",
      "/teacher/hw-tests", "/teacher/leave", "/teacher/my-classes", "/teacher/profile", "/teacher/rate-calculator",
      "/teacher/requests", "/teacher/reschedule", "/teacher/resources", "/teacher/settings", "/teacher/vacancy",
    ],
    chains: [
      ["/teacher/my-classes", /^\/teacher\/my-classes\/[^/]+$/, /^\/teacher\/my-classes\/[^/]+\/[^/]+$/],
      ["/teacher/chat", /^\/teacher\/chat\/[^/]+$/],
      ["/teacher/blogs/read", /^\/teacher\/blogs\/read\/[^/]+$/],
      ["/teacher/certificates", /^\/teacher\/certificates\/[^/]+$/],
    ],
  },
  {
    name: "admin",
    login: true,
    pages: [
      "/admin", "/admin/account-access", "/admin/accounts", "/admin/activity-logs", "/admin/bank-accounts", "/admin/blogs",
      "/admin/chat", "/admin/chat-reports", "/admin/class-requests", "/admin/complaints", "/admin/courses",
      "/admin/enrollments", "/admin/leave-requests", "/admin/lowest-rated", "/admin/parent-directory",
      "/admin/payout-review", "/admin/profile", "/admin/refund-requests", "/admin/resources", "/admin/session-reviews",
      "/admin/staff-accounts", "/admin/teacher-directory", "/admin/teacher-strikes", "/admin/teachers", "/admin/users",
    ],
    chains: [
      ["/admin/teachers", /^\/admin\/teachers\/[^/]+$/],
      ["/admin/chat", /^\/admin\/chat\/[^/]+$/],
    ],
  },
  {
    name: "accounts",
    login: true,
    pages: [
      "/accounts", "/accounts/analytics", "/accounts/complaints", "/accounts/cycles", "/accounts/demo-bookings",
      "/accounts/invoices", "/accounts/payment-queue", "/accounts/revenue", "/accounts/verify", "/accounts/wallets",
    ],
    chains: [],
  },
  { name: "it", login: true, pages: ["/it", "/it/account-access", "/it/complaints"], chains: [] },
  { name: "hr", login: true, pages: ["/hr", "/hr/complaints"], chains: [] },
];

// Text that means "the page shows an error screen".
const HARD_ERROR_RE = "Application error|client-side exception|Internal Server Error|Unhandled Runtime Error|This page couldn.t load";
const SOFT_ERROR_RE = "Something went wrong|Failed to load|Unable to load|Could not load|Couldn.t load|Unexpected error";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pad2 = (n) => String(n).padStart(2, "0");
function timestampName(d = new Date()) {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_` +
    `${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`
  );
}
function truncate(s, n) {
  s = String(s ?? "").replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function gitInfo() {
  const run = (args) => {
    try {
      return execFileSync("git", args, { cwd: root, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch {
      return null;
    }
  };
  const hash = run(["rev-parse", "--short", "HEAD"]);
  if (!hash) return "n/a";
  return run(["status", "--porcelain"]) ? `${hash}+dirty` : hash;
}
function listSmokeRuns() {
  const base = path.join(root, DIAG_DIR);
  if (!fs.existsSync(base)) return [];
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => e.isDirectory() && RUN_DIR_RE.test(e.name))
    .map((e) => path.join(base, e.name))
    .filter((d) => fs.existsSync(path.join(d, "smoke.json")))
    .sort();
}
const loadSmoke = (dir) => JSON.parse(fs.readFileSync(path.join(dir, "smoke.json"), "utf8"));

/** FAIL-level problems as a map key -> label (used for NEW / FIXED). */
function failKeys(run) {
  const m = new Map();
  for (const r of run.roles) {
    if (r.status !== "RAN") {
      if (r.status === "ABORTED") m.set(`${r.role}|*|ROLE_ABORTED`, `[${r.role}] role aborted: ${r.reason}`);
      continue; // SKIPPED = no credentials, not a finding
    }
    for (const p of r.pages) {
      for (const i of p.issues) {
        if (i.level === "FAIL") m.set(`${r.role}|${p.path}|${i.code}`, `[${r.role}] ${p.path}  ${i.code}  ${truncate(i.detail, 110)}`);
      }
    }
  }
  return m;
}
function diffRuns(prev, cur) {
  const a = failKeys(prev);
  const b = failKeys(cur);
  return {
    added: [...b].filter(([k]) => !a.has(k)).map(([, v]) => v),
    fixed: [...a].filter(([k]) => !b.has(k)).map(([, v]) => v),
  };
}
function formatCompare(prevName, curName, d) {
  const out = [`COMPARE  ${prevName}  ->  ${curName}`, `NEW failures: ${d.added.length}   FIXED: ${d.fixed.length}`];
  if (d.added.length) out.push("", "NEW", ...d.added.map((x) => "  " + x));
  if (d.fixed.length) out.push("", "FIXED", ...d.fixed.map((x) => "  " + x));
  if (!d.added.length && !d.fixed.length) out.push("", "No change in failures.");
  return out;
}

if (flag("--help") || flag("-h")) {
  console.log("node scripts/diagnose/smoke.mjs [--roles a,b] [--only /path] [--shots] [--headed] [--base url] [--settle ms] [--out dir] [--compare]\nSee the header of this file for details.");
  process.exit(0);
}

if (flag("--compare")) {
  const runs = listSmokeRuns();
  if (runs.length < 2) {
    console.log("Need at least two smoke runs in diagnostics/ to compare.");
    process.exit(0);
  }
  const [p, c] = runs.slice(-2);
  console.log(formatCompare(path.basename(p), path.basename(c), diffRuns(loadSmoke(p), loadSmoke(c))).join("\n"));
  process.exit(0);
}

// Safety: only talk to a local app unless explicitly allowed.
let baseUrl;
try {
  baseUrl = new URL(BASE);
} catch {
  console.error(`Invalid --base: ${BASE}`);
  process.exit(2);
}
if (!["localhost", "127.0.0.1"].includes(baseUrl.hostname) && !flag("--allow-remote")) {
  console.error(`Refusing to run against ${baseUrl.hostname}. This tool signs in with real accounts; pass --allow-remote only if you really mean it.`);
  process.exit(2);
}

let chromium;
try {
  ({ chromium } = createRequire(path.join(root, "package.json"))("playwright"));
} catch {
  console.error("Playwright is not installed. Run:  npm i -D playwright   then   npx playwright install chromium");
  process.exit(2);
}

// ---------------------------------------------------------------------------
// Login (server route sets httpOnly cookies on the browser context)
// ---------------------------------------------------------------------------

async function login(context, roleName) {
  const key = roleName.toUpperCase();
  const email = process.env[`SMOKE_${key}_EMAIL`];
  const password = process.env[`SMOKE_${key}_PASSWORD`];
  if (!email || !password) return { ok: false, reason: `no credentials (set SMOKE_${key}_EMAIL / SMOKE_${key}_PASSWORD)` };
  try {
    const res = await context.request.post(`${BASE}/api/auth/login`, { data: { email, password }, timeout: 30_000 });
    let body = null;
    try {
      body = await res.json();
    } catch {
      /* not JSON */
    }
    if (!res.ok() || !body || body.error) {
      return { ok: false, reason: `login refused (HTTP ${res.status()}${body?.error ? `: ${truncate(body.error, 80)}` : ""})` };
    }
    if (body.challenge) return { ok: false, reason: `login needs ${body.challenge}; sign in once by hand first` };
    return { ok: true, role: body.role ?? null };
  } catch (e) {
    return { ok: false, reason: `login request failed: ${truncate(e.message, 100)}` };
  }
}

// ---------------------------------------------------------------------------
// Visit one page and collect everything that looks wrong
// ---------------------------------------------------------------------------

const state = { current: null }; // record of the page being visited (for blocked writes)

async function visitPage(context, roleName, urlPath, outDir) {
  const page = await context.newPage();
  const rec = { path: urlPath, finalPath: null, httpStatus: null, ms: 0, status: "OK", issues: [], info: [] };
  const seen = new Set();
  const pending = [];
  const add = (level, code, detail) => {
    const k = `${code}|${detail}`;
    if (seen.has(k)) return;
    seen.add(k);
    rec.issues.push({ level, code, detail: truncate(detail, 240) });
  };
  state.current = rec;

  page.on("pageerror", (e) => add("FAIL", "PAGE_ERROR", e?.message ?? String(e)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const t = m.text();
    if (/Failed to load resource/i.test(t)) return; // covered by the response check
    add(/hydrat/i.test(t) ? "FAIL" : "WARN", /hydrat/i.test(t) ? "HYDRATION_ERROR" : "CONSOLE_ERROR", t);
  });
  page.on("response", (resp) => {
    let u;
    try {
      u = new URL(resp.url());
    } catch {
      return;
    }
    if (u.origin !== baseUrl.origin) return; // ignore third parties
    const status = resp.status();
    if (status < 400) return;
    const req = resp.request();
    if (req.resourceType() === "document") return; // main document handled below
    if (u.pathname.startsWith("/api/")) {
      pending.push(
        (async () => {
          let msg = "";
          try {
            msg = (await resp.text()).slice(0, 150);
          } catch {
            /* body not available */
          }
          const detail = `${req.method()} ${u.pathname} -> ${status} ${msg}`;
          if (status >= 500) add("FAIL", "API_5XX", detail);
          else if (status === 401 || status === 403) {
            if (roleName === "public") rec.info.push({ code: "API_AUTH_PUBLIC", detail: `${req.method()} ${u.pathname} -> ${status}` });
            else add("FAIL", `API_${status}`, detail);
          } else add("WARN", `API_${status}`, detail);
        })(),
      );
    } else {
      add("WARN", `ASSET_${status}`, u.pathname);
    }
  });
  page.on("requestfailed", (req) => {
    const err = req.failure()?.errorText ?? "";
    if (/ERR_ABORTED|BLOCKED_BY_CLIENT/i.test(err)) return; // navigation cancels / our write block
    let u;
    try {
      u = new URL(req.url());
    } catch {
      return;
    }
    if (u.origin !== baseUrl.origin) return;
    add("WARN", "REQUEST_FAILED", `${req.method()} ${u.pathname} ${err}`);
  });

  const t0 = Date.now();
  let resp = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      resp = await page.goto(BASE + urlPath, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      break;
    } catch (e) {
      if (attempt === 2) add("FAIL", "NAV_FAILED", String(e.message).split("\n")[0]);
    }
  }
  if (resp) {
    rec.httpStatus = resp.status();
    if (resp.status() >= 400) add("FAIL", `HTTP_${resp.status()}`, `${urlPath} answered ${resp.status()}`);
    await page.waitForLoadState("load", { timeout: 15_000 }).catch(() => {});
    await page.waitForTimeout(SETTLE_MS);
    await Promise.allSettled(pending);

    try {
      rec.finalPath = new URL(page.url()).pathname.replace(/\/+$/, "") || "/";
    } catch {
      rec.finalPath = null;
    }
    const wanted = urlPath.replace(/\/+$/, "") || "/";
    if (rec.finalPath && rec.finalPath !== wanted) {
      if (/^\/(login|session-expired|access-denied|maintenance)(\/|$)/.test(rec.finalPath)) {
        add("FAIL", `REDIRECTED_TO_${rec.finalPath.split("/")[1].toUpperCase().replace(/-/g, "_")}`, `${wanted} -> ${rec.finalPath}`);
      } else add("WARN", "REDIRECTED", `${wanted} -> ${rec.finalPath}`);
    }

    // Inspect the page (only counts and matched phrases leave the browser, never page text).
    let dom = null;
    for (let attempt = 1; attempt <= 2 && !dom; attempt++) {
      dom = await page
        .evaluate(
          ([hardSrc, softSrc]) => {
            const text = (document.body?.innerText || "").trim();
            const hard = text.match(new RegExp(hardSrc, "i"));
            const soft = text.match(new RegExp(softSrc, "i"));
            let overlay = false;
            try {
              overlay = !!document.querySelector("nextjs-portal")?.shadowRoot?.querySelector("[data-nextjs-dialog], [data-nextjs-dialog-overlay]");
            } catch {
              /* best effort */
            }
            const links = [...document.querySelectorAll("a[href]")].map((a) => a.getAttribute("href"));
            return { len: text.length, hard: hard?.[0] ?? null, soft: soft?.[0] ?? null, overlay, links };
          },
          [HARD_ERROR_RE, SOFT_ERROR_RE],
        )
        .catch(() => null);
      if (!dom) await page.waitForTimeout(1000);
    }
    if (!dom) add("FAIL", "DOM_UNREADABLE", "could not read the page after load");
    else {
      if (dom.len < 15) add("FAIL", "BLANK_PAGE", `page text is ${dom.len} characters`);
      if (dom.overlay) add("FAIL", "NEXT_ERROR_OVERLAY", "Next.js error overlay is showing");
      if (dom.hard) add("FAIL", "ERROR_PAGE", `page shows: "${dom.hard}"`);
      else if (dom.soft) add("WARN", "ERROR_TEXT", `page shows: "${dom.soft}"`);
    }
    rec.links = dom
      ? [...new Set(dom.links.filter((l) => typeof l === "string" && l.startsWith("/") && !l.startsWith("//")).map((l) => l.split(/[?#]/)[0].replace(/\/+$/, "") || "/"))]
      : [];
  } else {
    rec.links = [];
  }

  rec.ms = Date.now() - t0;
  rec.status = rec.issues.some((i) => i.level === "FAIL") ? "FAIL" : rec.issues.some((i) => i.level === "WARN") ? "WARN" : "OK";

  if (flag("--shots") && rec.status !== "OK") {
    try {
      const dir = path.join(outDir, "smoke-shots");
      fs.mkdirSync(dir, { recursive: true });
      const file = `${roleName}_${urlPath.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "home"}.png`;
      await page.screenshot({ path: path.join(dir, file) });
      rec.screenshot = `smoke-shots/${file}`;
    } catch {
      /* screenshot is optional */
    }
  }

  const links = rec.links;
  delete rec.links; // keep smoke.json small; links are only needed for following chains
  await page.close().catch(() => {});
  state.current = null;
  return { rec, links };
}

// ---------------------------------------------------------------------------
// Run one role
// ---------------------------------------------------------------------------

/** Aborts every write the pages try to send (the smoke test must never change data). */
const blockWrites = (route) => {
  const req = route.request();
  const m = req.method();
  if (m === "GET" || m === "HEAD" || m === "OPTIONS") return route.continue();
  let p = req.url();
  try {
    p = new URL(req.url()).pathname;
  } catch {
    /* keep raw url */
  }
  if (state.current) state.current.info.push({ code: "BLOCKED_WRITE", detail: `${m} ${p}` });
  return route.abort("blockedbyclient");
};

async function runRole(browser, role, outDir) {
  const rr = { role: role.name, status: "RAN", reason: null, loginRole: null, pages: [], notes: [] };
  const context = await browser.newContext({ viewport: { width: 1366, height: 850 } });
  try {
    if (role.login) {
      const lg = await login(context, role.name);
      if (!lg.ok) {
        rr.status = "SKIPPED";
        rr.reason = lg.reason;
        console.log(`[${role.name}] skipped: ${lg.reason}`);
        return rr;
      }
      rr.loginRole = lg.role;
    }
    await context.route("**/*", blockWrites); // after login on purpose

    const visited = new Map();
    const linkCache = new Map();
    const go = async (p) => {
      if (visited.has(p)) return visited.get(p);
      const { rec, links } = await visitPage(context, role.name, p, outDir);
      visited.set(p, rec);
      linkCache.set(p, links);
      rr.pages.push(rec);
      console.log(`  [${role.name}] ${rec.status.padEnd(4)}  ${p}${rec.issues[0] ? `   ${rec.issues[0].code}` : ""}`);
      return rec;
    };

    const pages = role.pages.filter((p) => !ONLY || p.includes(ONLY));
    for (const p of pages) {
      await go(p);
      // If the first two pages of a logged-in role both bounce to the login screen, the session is not accepted.
      if (role.login && rr.pages.length === 2 && rr.pages.every((x) => x.issues.some((i) => i.code === "REDIRECTED_TO_LOGIN"))) {
        rr.status = "ABORTED";
        rr.reason = "browser was sent back to /login on the first pages (session cookie not accepted?)";
        console.log(`[${role.name}] aborted: ${rr.reason}`);
        return rr;
      }
    }

    for (const [start, ...steps] of role.chains ?? []) {
      if (ONLY && !start.includes(ONLY)) continue;
      let current = start;
      if (!visited.has(current)) await go(current);
      for (const re of steps) {
        const next = (linkCache.get(current) ?? []).find((l) => l !== current && re.test(l));
        if (!next) {
          rr.notes.push(`no link matching ${re} on ${current}: detail page not tested (no data, or page failed)`);
          break;
        }
        await go(next);
        current = next;
      }
    }
    return rr;
  } finally {
    await context.close().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

function counts(pages) {
  const c = { OK: 0, WARN: 0, FAIL: 0 };
  for (const p of pages) c[p.status]++;
  return c;
}

function renderReport(run) {
  const out = [`LEARNIEE SMOKE TEST  ${run.meta.timestamp}  commit ${run.meta.commit}  base ${run.meta.base}`, ""];
  for (const r of run.roles) {
    const c = counts(r.pages);
    out.push(`== ${r.role}  [${r.status}]${r.loginRole ? `  logged in as role: ${r.loginRole}` : ""}${r.reason ? `  (${r.reason})` : ""}`);
    if (r.status === "RAN" || r.status === "ABORTED") out.push(`   pages ${r.pages.length}: OK ${c.OK}  WARN ${c.WARN}  FAIL ${c.FAIL}`);
    for (const p of r.pages) {
      out.push(`   ${p.status.padEnd(4)}  ${p.path}   ${p.ms}ms${p.finalPath && p.finalPath !== p.path ? `  -> ${p.finalPath}` : ""}`);
      for (const i of p.issues) out.push(`         ${i.level} ${i.code}  ${i.detail}`);
      for (const i of p.info) out.push(`         info ${i.code}  ${i.detail}`);
      if (p.screenshot) out.push(`         screenshot: ${p.screenshot}`);
    }
    for (const n of r.notes) out.push(`   note: ${n}`);
    out.push("");
  }
  return out.join("\n") + "\n";
}

function renderSummary(run, diff) {
  const lines = [`SMOKE ${run.meta.timestamp}  commit ${run.meta.commit}  base ${run.meta.base}  (${run.meta.durationSec}s)`];
  let tot = { OK: 0, WARN: 0, FAIL: 0 };
  const skipped = [];
  for (const r of run.roles) {
    if (r.status === "SKIPPED") {
      skipped.push(`${r.role} (${r.reason})`);
      continue;
    }
    const c = counts(r.pages);
    for (const k of Object.keys(tot)) tot[k] += c[k];
    lines.push(`${r.role.padEnd(9)} ${String(r.pages.length).padStart(3)} pages | OK ${c.OK} | WARN ${c.WARN} | FAIL ${c.FAIL}${r.status === "ABORTED" ? "  ABORTED" : ""}`);
  }
  lines.push(`TOTAL     ${tot.OK + tot.WARN + tot.FAIL} pages | OK ${tot.OK} | WARN ${tot.WARN} | FAIL ${tot.FAIL}`);
  if (skipped.length) lines.push(`skipped: ${skipped.map((s) => truncate(s, 70)).join("; ")}`);
  lines.push(diff ? `vs ${run.compare.previous}: NEW ${diff.added.length}, FIXED ${diff.fixed.length}` : "vs previous: no earlier smoke run");
  lines.push("");

  const top = [];
  for (const r of run.roles) {
    if (r.status === "ABORTED") top.push(`[${r.role}] ABORTED: ${r.reason}`);
    for (const p of r.pages) {
      const f = p.issues.filter((i) => i.level === "FAIL");
      if (f.length) top.push(`[${r.role}] ${p.path}  ${f[0].code}  ${truncate(f[0].detail, 100)}${f.length > 1 ? `  (+${f.length - 1} more)` : ""}`);
    }
  }
  lines.push(top.length ? `TOP FAILURES (${top.length} pages; full list in smoke.txt)` : "TOP FAILURES: none");
  const room = 40 - lines.length;
  for (const t of top.slice(0, Math.max(room, 0))) lines.push("  " + truncate(t, 160));
  return lines.slice(0, 40);
}

function appendHistory(run) {
  const csv = path.join(root, DIAG_DIR, "smoke-history.csv");
  let pages = 0, ok = 0, warn = 0, fail = 0;
  const skipped = [];
  for (const r of run.roles) {
    if (r.status === "SKIPPED") skipped.push(r.role);
    const c = counts(r.pages);
    pages += r.pages.length; ok += c.OK; warn += c.WARN; fail += c.FAIL;
  }
  const header = "timestamp,commit,base,pages,ok,warn,fail,skipped_roles\n";
  const row = [run.meta.timestamp, run.meta.commit, run.meta.base, pages, ok, warn, fail, skipped.join("|")]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(",") + "\n";
  fs.mkdirSync(path.dirname(csv), { recursive: true });
  if (!fs.existsSync(csv)) fs.writeFileSync(csv, header);
  fs.appendFileSync(csv, row);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const startedAt = new Date();
  try {
    await fetch(`${BASE}/login`, { signal: AbortSignal.timeout(20_000), redirect: "manual" });
  } catch {
    console.error(`Cannot reach ${BASE}. Start the app first (npm run dev) and run this again.`);
    process.exit(2);
  }

  const previous = listSmokeRuns().pop() ?? null;
  const outArg = val("--out");
  const outDir = outArg ? path.resolve(root, outArg) : path.join(root, DIAG_DIR, timestampName(startedAt));
  fs.mkdirSync(outDir, { recursive: true });

  const selected = ROLES.filter((r) => !ROLE_FILTER.length || ROLE_FILTER.includes(r.name));
  if (!selected.length) {
    console.error(`No matching roles. Known: ${ROLES.map((r) => r.name).join(", ")}`);
    process.exit(2);
  }

  const browser = await chromium.launch({ headless: !flag("--headed") });
  const roles = [];
  try {
    for (const role of selected) {
      console.log(`\n== ${role.name}`);
      roles.push(await runRole(browser, role, outDir));
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const run = {
    meta: {
      timestamp: path.basename(outDir),
      generatedAt: startedAt.toISOString(),
      commit: gitInfo(),
      base: BASE,
      node: process.version,
      durationSec: Math.round((Date.now() - startedAt.getTime()) / 1000),
      only: ONLY,
    },
    roles,
  };

  let diff = null;
  if (previous && path.resolve(previous) !== path.resolve(outDir)) {
    try {
      diff = diffRuns(loadSmoke(previous), run);
      run.compare = { previous: path.basename(previous), added: diff.added.length, fixed: diff.fixed.length };
    } catch {
      /* previous run unreadable: skip the comparison */
    }
  }

  fs.writeFileSync(path.join(outDir, "smoke.json"), JSON.stringify(run, null, 2));
  fs.writeFileSync(path.join(outDir, "smoke.txt"), renderReport(run));
  fs.writeFileSync(path.join(outDir, "SMOKE_SUMMARY.txt"), renderSummary(run, diff).join("\n") + "\n");
  if (diff) fs.writeFileSync(path.join(outDir, "smoke-compare.txt"), formatCompare(run.compare.previous, run.meta.timestamp, diff).join("\n") + "\n");
  appendHistory(run);

  console.log("\n" + renderSummary(run, diff).join("\n"));
  console.log(`\nSaved to: ${path.relative(root, outDir)}`);
}

main().catch((err) => {
  console.error("Smoke test failed:", err?.stack || err);
  process.exit(2);
});
