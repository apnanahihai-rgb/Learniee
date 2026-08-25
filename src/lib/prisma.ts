import { readFileSync } from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const caCert = readFileSync(
  path.join(process.cwd(), "certs/rds-global-bundle.pem"),
).toString();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: caCert,
    rejectUnauthorized: true, // now safe — we trust the real AWS CA
  },
  max: 1,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

globalForPrisma.prisma = prisma;