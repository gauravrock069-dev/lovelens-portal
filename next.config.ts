import type { NextConfig } from "next";

const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/gallery/:path*", headers: noindex },
      { source: "/admin/:path*", headers: noindex },
    ];
  },
};

export default nextConfig;
