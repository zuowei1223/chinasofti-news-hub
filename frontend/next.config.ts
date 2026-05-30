import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 运行时配置 - 客户端可访问
  publicRuntimeConfig: {
    apiBase: "",
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "ngrok-skip-browser-warning",
            value: "true",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:8100/api/:path*",
      },
    ];
  },
};

export default nextConfig;
