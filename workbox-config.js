module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,html,ico,png,json,css,ttf,woff,woff2}'],
  swDest: 'dist/sw.js',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 7 },
        networkTimeoutSeconds: 10,
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: { maxEntries: 30, maxAgeSeconds: 60 * 30 },
        networkTimeoutSeconds: 10,
      },
    },
  ],
};
