import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

const ROUTES = [
  "demo-reminders",
  "due-date-reminders",
  "enrollment-auto-lapse",
  "payout-reconcile",
  "resolve-sessions",
  "session-reminders",
] as const;

const SECRET = "test-cron-secret";

async function call(name: string, headers: Record<string, string> = {}) {
  const mod = (await import(`@/app/api/cron/${name}/route`)) as { GET: (r: Request) => Promise<Response> };
  return mod.GET(new Request(`http://localhost/api/cron/${name}`, { headers }));
}

beforeAll(async () => {
  await resetDb();
});
beforeEach(() => {
  process.env.CRON_SECRET = SECRET;
  process.env.RAZORPAYX_ENABLED = "false";
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  process.env.CRON_SECRET = SECRET;
});

describe.each(ROUTES)("cron route /api/cron/%s", (name) => {
  it("no Authorization header -> 401", async () => {
    expect((await call(name)).status).toBe(401);
  });
  it("wrong secret -> 401", async () => {
    expect((await call(name, { authorization: "Bearer nope" })).status).toBe(401);
  });
  it("secret without the 'Bearer ' prefix -> 401", async () => {
    expect((await call(name, { authorization: SECRET })).status).toBe(401);
  });
  it("CRON_SECRET not set on the server -> 401 (fails closed), even with a header", async () => {
    delete process.env.CRON_SECRET;
    expect((await call(name, { authorization: "Bearer " })).status).toBe(401);
    expect((await call(name, { authorization: "Bearer undefined" })).status).toBe(401);
  });
  it("correct secret -> 200 and success:true on an empty database", async () => {
    const res = await call(name, { authorization: `Bearer ${SECRET}` });
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });
  it("running it twice in a row is safe (idempotent)", async () => {
    const h = { authorization: `Bearer ${SECRET}` };
    expect((await call(name, h)).status).toBe(200);
    expect((await call(name, h)).status).toBe(200);
  });
});

describe("payout-reconcile when RazorpayX is off", () => {
  it("is skipped on purpose, never calls the gateway", async () => {
    const res = await call("payout-reconcile", { authorization: `Bearer ${SECRET}` });
    const body = await res.json();
    expect(body.skipped).toMatch(/RAZORPAYX_ENABLED/);
  });
});