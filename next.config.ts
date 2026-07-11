import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The verification runner reads spec suites and demo submissions from disk
  // at request time — make sure they ship inside the serverless bundle.
  outputFileTracingIncludes: {
    "/p/\\[slug\\]": ["./specs/**/*", "./submissions/**/*"],
    "/": ["./specs/**/*", "./submissions/**/*"],
  },
};

export default nextConfig;
