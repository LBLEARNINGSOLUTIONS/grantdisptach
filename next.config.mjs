/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'self' https://teams.microsoft.com https://*.sharepoint.com https://*.microsoft.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
