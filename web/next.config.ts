import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // An unrelated lockfile sits above this repo, so pin the workspace root here
  // rather than letting Next infer the wrong one.
  turbopack: {
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
