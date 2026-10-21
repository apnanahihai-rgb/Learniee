/// <reference types="vite/client" />
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Phase 5 security sweep: calls EVERY src/app/api/**\/route.ts handler with
 *   1. no token, 2. a bad (expired/tampered) token, 3. a valid token of the
 * wrong role, and expects 401/403 every time. Public-by-design routes,
 * cron routes (own secret) and webhooks (own signature) have their own rules.
 *
 * Tokens are fakes: the Cognito verifier is mocked, so no AWS and no database
 * rows are needed. Token format: "valid.<role>.<sub>"; anything else throws.
 */

const state = vi.hoisted(() => ({ token: undefined as string | undefined }));

vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: async (token: string) => {
        const [kind, role, sub] = token.split(".");
        if (kind !== "valid") throw new Error("invalid token");
        return {
          sub,
          "custom:role": role,
          email: `${sub}@test.local`,
          given_name: "Test",
          family_name: "User",
        };
      },
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "idToken" && state.token ? { value: state.token } : undefined,
  }),
  headers: async () =>
    new Headers(state.token ? { cookie: `idToken=${state.token}` } : {}),
}));

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const loaders = import.meta.glob("/src/app/api/**/route.ts");

const routes = Object.entries(loaders)
  .map(([file, load]) => ({
    label: file.replace("/src/app/api", "").replace("/route.ts", ""),
    load: load as () => Promise<Record<string, unknown>>,
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

const area = (label: string) => label.split("/")[1];

/** Public by design: no login needed. */
const PUBLIC_AREAS = new Set(["blog-images"]);

/** Valid token of a role that must be REFUSED in that area. */
const WRONG_ROLE_TOKEN: Record<string, string> = {
  admin: "valid.parent.p1",
  parent: "valid.teacher.t1",
  teacher: "valid.parent.p1",
  accounts: "valid.parent.p1",
  it: "valid.parent.p1",
  staff: "valid.parent.p1",
};

const BAD_TOKEN = "expired.parent.p1";

/** Deprecated routes that only answer 410 Gone (do nothing, need no auth). */
const GONE_ROUTES = new Set(["/parent/enrollments"]);

/** Routes that read the body before auth: send a valid body so auth is what gets tested. */
const ROUTE_BODY: Record<string, string> = {
  "/upload/presign": JSON.stringify({
    folder: "teacher-documents",
    fileName: "a.pdf",
    contentType: "application/pdf",
  }),
};

async function call(
  label: string,
  handler: Handler,
  method: string,
  opts: { token?: string; authorization?: string; body?: string },
): Promise<number> {
  state.token = opts.token;
  const headers = new Headers({ "content-type": "application/json" });
  if (opts.token) headers.set("cookie", `idToken=${opts.token}`);
  if (opts.authorization) headers.set("authorization", opts.authorization);

  const req = new NextRequest(`http://localhost/api${label}`, {
    method,
    headers,
    body: method === "GET" ? undefined : (opts.body ?? ROUTE_BODY[label] ?? "{}"),
  });
  const ctx = {
    params: Promise.resolve(
      new Proxy({} as Record<string, string>, {
        get: (_t, k) => (typeof k === "string" ? "test-id" : undefined),
      }),
    ),
  };

  try {
    const res = await handler(req, ctx);
    return res.status;
  } finally {
    state.token = undefined;
  }
}

describe("API security sweep", () => {
  it("finds the route files", () => {
    expect(routes.length).toBeGreaterThan(150);
  });

  it.each(routes.map((r) => [r.label, r] as const))(
    "%s refuses unauthenticated / wrong-role callers",
    async (_label, route) => {
      const mod = await route.load();
      const a = area(route.label);
      const failures: string[] = [];

      const check = async (
        what: string,
        method: string,
        handler: Handler,
        opts: Parameters<typeof call>[3],
        allowed: number[],
      ) => {
        let status: number;
        try {
          status = await call(route.label, handler, method, opts);
        } catch (e) {
          failures.push(`${method} (${what}): threw ${(e as Error).message}`);
          return;
        }
        if (!allowed.includes(status)) {
          failures.push(`${method} (${what}): got ${status}, expected ${allowed.join("/")}`);
        }
      };

      for (const method of METHODS) {
        const handler = mod[method] as Handler | undefined;
        if (typeof handler !== "function") continue;

        if (PUBLIC_AREAS.has(a)) continue;

        if (GONE_ROUTES.has(route.label) && method === "POST") {
          await check("gone", method, handler, {}, [410]);
          continue;
        }

        if (a === "webhooks") {
          await check("no signature", method, handler, {}, [400, 401, 403]);
          continue;
        }

        if (a === "cron") {
          const saved = process.env.CRON_SECRET;
          await check("no header", method, handler, {}, [401]);
          await check("wrong secret", method, handler, { authorization: "Bearer wrong" }, [401]);
          delete process.env.CRON_SECRET;
          await check("secret unset (fail closed)", method, handler, { authorization: "Bearer undefined" }, [401]);
          if (saved !== undefined) process.env.CRON_SECRET = saved;
          continue;
        }

        await check("no token", method, handler, {}, [401, 403]);
        await check("bad token", method, handler, { token: BAD_TOKEN }, [401, 403]);

        const wrong = WRONG_ROLE_TOKEN[a];
        if (wrong) {
          await check("wrong role", method, handler, { token: wrong }, [401, 403]);
        }
      }

      expect(failures, `${route.label}\n  ${failures.join("\n  ")}`).toEqual([]);
    },
    30_000,
  );
});