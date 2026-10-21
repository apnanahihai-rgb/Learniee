import { config } from "dotenv";
config({ path: ".env.test", override: true });

const url = new URL(process.env.DATABASE_URL ?? "postgresql://invalid");
const dbName = url.pathname.slice(1);
if (!["localhost", "127.0.0.1"].includes(url.hostname) || !dbName.endsWith("_test")) {
  throw new Error(
    `Refusing to run: DATABASE_URL must be localhost and a *_test database (got ${url.hostname}/${dbName})`
  );
}