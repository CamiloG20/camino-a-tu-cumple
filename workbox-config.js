module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,html,ico,png,json,css,ttf,woff,woff2}'],
  swDest: 'dist/sw.js',
  skipWaiting: true,
  clientsClaim: true,
  maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
  navigateFallback: '/index.html',
  navigateFallbackDenylist: [/^\/api\//],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*\.(mp3|m4a|wav|ogg)(\?.*)?$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-audio',
        expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 30 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'supabase-storage',
        expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 14 },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 30 },
        networkTimeoutSeconds: 8,
      },
    },
  ],
};
