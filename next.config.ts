import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// `next dev` sırasında Cloudflare bindinglerine (Queue vb.) erişim için.
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // Birden fazla lockfile olduğunda doğru workspace kökünü sabitle.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
