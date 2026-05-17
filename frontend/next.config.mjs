/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
