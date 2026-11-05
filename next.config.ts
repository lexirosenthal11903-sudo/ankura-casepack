import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The data files are read at runtime, so make sure they are deployed with the server functions.
  outputFileTracingIncludes: {
    "/**": ["./data/**/*"],
  },
};

export default nextConfig;
