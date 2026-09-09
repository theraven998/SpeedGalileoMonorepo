import type { NextConfig } from "next";

// Deploy estático (Firebase Hosting, plan Spark): sin servidor Next, por lo
// tanto sin rewrites server-side. En prod NEXT_PUBLIC_API_URL debe apuntar
// directo al backend (ver .env.local); en dev local next.config usa el otro
// modo con rewrites — este archivo es solo para el build de producción.
const isExport = process.env.NEXT_OUTPUT_EXPORT === "1";

const nextConfig: NextConfig = isExport
  ? { output: "export" }
  : {
      async rewrites() {
        const backendUrl = process.env.BACKEND_INTERNAL_URL ?? "http://localhost:4000";
        return [{ source: "/api/:path*", destination: `${backendUrl}/api/:path*` }];
      },
    };

export default nextConfig;
