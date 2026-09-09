import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: false,
  register: true,
  disable: process.env.NODE_ENV === "development",
  exclude: [/\.webmanifest$/],
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: {
    // Los .md de personalidad de los dinos se leen con readFileSync en
    // runtime; en serverless (Vercel) hay que garantizar que entren al bundle.
    "/api/chat": ["./lib/dinos/**/*.md"],
  },
};

export default withSerwist(nextConfig);