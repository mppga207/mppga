import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Next 15 lowered the dynamic Router Cache TTL from 30s to 0s, so
    // every dashboard tab click refetches the RSC payload even when the
    // user just left that tab. Restore the Next 14 behavior. Mutating
    // actions across the codebase already call revalidatePath for the
    // routes they affect (audited 2026-05-17), so staleness is bounded.
    staleTimes: {
      dynamic: 30,
    },
  },
};

export default nextConfig;
