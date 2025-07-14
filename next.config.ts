import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
    env: {
        NEXT_PUBLIC_SITE_URL: process.env?.NEXT_PUBLIC_SITE_URL ??
        process.env?.NEXT_PUBLIC_VERCEL_URL ??
        process.env?.NEXT_PUBLIC_VERCEL_BRANCH_URL ??
        process.env?.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
    }
};

export default nextConfig;
