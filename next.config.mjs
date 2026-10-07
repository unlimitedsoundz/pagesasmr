/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['music-metadata'],
  async rewrites() {
    return [
      {
        source: '/sitemap',
        destination: '/sitemap.xml',
      },
    ];
  },
};

export default nextConfig;
