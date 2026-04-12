import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const config = {
    reactStrictMode: true,
    images: {
      domains: ['localhost'],
    },
    // Fix chunk loading issues
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        config.optimization.splitChunks = {
          chunks: 'all',
          cacheGroups: {
            default: {
              minChunks: 1,
              priority: -20,
              reuseExistingChunk: true,
            },
            vendors: {
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        };
      }
      return config;
    },
    // Increase timeout for chunk loading
    experimental: {
      webpackBuildWorker: true,
    },
  };
  
  export default withPWA({
    dest: 'public',
    register: true,
    skipWaiting: true,
  })(config);
