/// <reference types="vite/client" />
import { writeFileSync } from "node:fs";
import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

/**
 * Forged-token sweep (06 #21). Builds an UNSIGNED but well-formed, unexpired JWT
 * claiming the area's role and sends it to every route in that area. The real
 * Cognito verifier is mocked to reject it (as Cognito would, bad signature).
 * Any route that does NOT answer 401/403 trusted the forged token.
 * Handlers that trust it DO run (against the guarded test DB only).
 * Exposed routes are written to forged-exposed.txt in the project root.
 */

const state = vi.hoisted(() => ({ token: undefined as string | undefined }));

vi.mock("aws-jwt-verify", () => ({
  CognitoJwtVerifier: {
    create: () => ({
      verify: async () => {
        throw new Error("signature verification failed");
      },
    }),
  },
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "idToken" && state.token ? { value: state.token } : undefined),
  }),
  headers: async () => new Headers(state.token ? { cookie: `idToken=${state.token}` } : {}),
}));

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
function forge(role: string) {
  const payload = {
    sub: `forged-${role}`,
    "custom:role": role,
    email: `forged-${role}@test.local`,
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  return `${b64({ alg: "none", typ: "JWT" })}.${b64(payload)}.forgedsignature`;
}

type Handler = (
  req: NextRequest,
  ctx: { params: Promise<Record<string, string>> },
) => Promise<Response> | Response;

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;
const loaders = import.meta.glob("/src/app/api/**/route.ts");

const ROLE_FOR_AREA: Record<string, string> = {
  admin: "admin",
  parent: "parent",
  teacher: "teacher",
  accounts: "accounts",
  hr: "hr",
  it: "it",
};

const params = new Proxy({}, { get: (_t, k) => (k === "then" ? undefined : "x") }) as Record<string, string>;

describe("forged token sweep", () => {
  it("no route trusts an unsigned token", async () => {
    const exposed: string[] = [];
    let checked = 0;

    for (const [file, load] of Object.entries(loaders)) {
      const label = file.replace("/src/app/api", "").replace("/route.ts", "");
      const area = label.split("/")[1];
      const role = ROLE_FOR_AREA[area];
      if (!role) continue;

      const mod = (await (load as () => Promise<Record<string, unknown>>)()) as Record<string, unknown>;
      const url = "http://localhost/api" + label.replace(/\[[^\]]+\]/g, "x");

      for (const method of METHODS) {
        const handler = mod[method] as Handler | undefined;
        if (typeof handler !== "function") continue;

        const token = forge(role);
        state.token = token;
        checked++;
        const req = new NextRequest(url, {
          method,
          headers: { cookie: `idToken=${token}`, "content-type": "application/json" },
          body: method === "GET" ? undefined : "{}",
        });

        try {
          const res = await Promise.race([
            Promise.resolve(handler(req, { params: Promise.resolve(params) })),
            new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout")), 5000)),
          ]);
          if (![401, 403, 410].includes(res.status)) exposed.push(`${res.status} ${method} ${label}`);
        } catch (e) {
          exposed.push(`THREW(${(e as Error).message.slice(0, 40)}) ${method} ${label}`);
        }
      }
    }

    state.token = undefined;
    writeFileSync("forged-exposed.txt", `checked ${checked} handlers\n` + exposed.join("\n") + "\n");
    expect(exposed).toEqual([]);
  }, 300_000);
});