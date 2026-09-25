import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Resolves the "outside current Git repository" package-lock.json warning
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
