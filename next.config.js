/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['recharts', '@dnd-kit/core', '@dnd-kit/sortable', 'date-fns'],
  },
}

module.exports = nextConfig
