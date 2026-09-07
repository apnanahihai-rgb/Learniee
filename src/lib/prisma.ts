import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const caCert = readFileSync(
  path.join(process.cwd(), "certs/rds-global-bundle.pem"),
).toString();

// Pool size: on Vercel, every serverless invocation can spin up its own
// connection, so we keep this at 1 to avoid exhausting RDS Free Tier's
// connection cap. Locally (`next dev`), the app runs as a single
// long-lived process instead, and one page load fires many parallel API
// calls (profile, students, courses, demo-bookings, wallet, calendar,
// reschedule-requests, enrollments, ...) — capping at 1 there just makes
// every request but the first queue up and time out waiting for the pool.
// Override with DATABASE_POOL_MAX if you need a different value in either
// environment.
const isServerless = Boolean(process.env.VERCEL);
const defaultPoolMax = isServerless ? 1 : 5;
const poolMax = process.env.DATABASE_POOL_MAX
  ? Number(process.env.DATABASE_POOL_MAX)
  : defaultPoolMax;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: caCert,
    rejectUnauthorized: true, // now safe — we trust the real AWS CA
  },
  max: poolMax,
  idleTimeoutMillis: 10_000,
  // A bit more headroom than 5s so a cold RDS connection under a burst of
  // parallel requests doesn't spuriously time out before it can even get a
  // pool slot.
  connectionTimeoutMillis: 10_000,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;