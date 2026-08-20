const { generateSW } = require('workbox-build');
const path = require('path');

async function build() {
  const swDest = path.join(process.cwd(), 'public', 'sw-workbox.js');

  await generateSW({
    swDest,
    globDirectory: path.join(process.cwd(), 'public'),
    globPatterns: ['**/*.{html,js,css,png,svg,ico,json}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: /\/api\//,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'jarbees-api-cache-v1',
          expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
          networkTimeoutSeconds: 5,
        },
      },
      {
        urlPattern: /\.(?:png|jpg|jpeg|svg|webp|ico)$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'jarbees-image-cache-v1',
          expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
        },
      },
    ],
    skipWaiting: true,
    clientsClaim: true,
  });

  console.log('Generated', swDest);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
