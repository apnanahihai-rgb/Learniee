import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requireCronAuth } from "@/lib/cronAuth";

const req = (auth?: string) =>
  new Request("http://localhost/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  });

describe("requireCronAuth", () => {
  const original = process.env.CRON_SECRET;
  beforeEach(() => {
    process.env.CRON_SECRET = "s3cret";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("allows the right secret", () => {
    expect(requireCronAuth(req("Bearer s3cret"))).toBeNull();
  });
  it("refuses a wrong secret", () => {
    expect(requireCronAuth(req("Bearer nope"))?.status).toBe(401);
  });
  it("refuses a missing header", () => {
    expect(requireCronAuth(req())?.status).toBe(401);
  });
  it("fails closed when CRON_SECRET is unset", () => {
    delete process.env.CRON_SECRET;
    expect(requireCronAuth(req())?.status).toBe(401);
    expect(requireCronAuth(req("Bearer undefined"))?.status).toBe(401);
    expect(requireCronAuth(req("Bearer "))?.status).toBe(401);
  });
});