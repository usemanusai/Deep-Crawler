/** @type {import('next').NextConfig} */
const nextConfig = {
  // Stable configuration for Next.js 15
  serverExternalPackages: ['@hyperbrowser/sdk', 'puppeteer-core'],

  experimental: {
    // Increase timeout for long-running API routes (SSE streams)
    serverActions: {
      bodySizeLimit: '2mb',
      timeout: 600, // 10 minutes in seconds
    }
  },

  // Configure server timeout for API routes
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },

  webpack: (config, { isServer }) => {
    // Prevent @hyperbrowser/sdk from being bundled into client code
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@hyperbrowser/sdk': false,
      };
    }

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    };
    return config;
  },
};

module.exports = nextConfig;
