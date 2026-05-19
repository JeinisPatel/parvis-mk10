/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  reactStrictMode: true,

  // Static export for Tauri bundling. Generates plain HTML/CSS/JS in `out/`
  // that Tauri's production build (`tauri build`) loads from disk. Only
  // affects `next build`; `next dev` is unaffected.
  output: 'export',

  // Static export can't process next/image at runtime — disable the optimizer.
  images: { unoptimized: true },

  // Tauri loads static files via a custom protocol; trailingSlash ensures
  // routes resolve to /path/index.html consistently.
  trailingSlash: true,
  // Proxy /api/* to the FastAPI backend in dev so we don't deal with CORS
  // for same-origin requests. In production, the backend lives at a
  // separate origin and the frontend talks to it directly via NEXT_PUBLIC_API_BASE.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
};

export default nextConfig;
