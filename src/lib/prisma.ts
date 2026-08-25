import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,                        // one connection per serverless invocation
  idleTimeoutMillis: 10_000,      // close idle connections quickly
  connectionTimeoutMillis: 5_000, // fail fast instead of hanging
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.prisma = prisma; // reuse across warm invocations in prod too