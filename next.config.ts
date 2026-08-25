import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  outputFileTracingIncludes: {
    "/api/**/*": ["./certs/rds-global-bundle.pem"],
  },
};

export default nextConfig;