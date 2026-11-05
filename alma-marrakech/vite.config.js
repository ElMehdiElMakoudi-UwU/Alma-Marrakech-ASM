import { defineConfig } from 'vite';

// Link previews and canonical links need full addresses, so they use the
// public URL when one is given at build time, e.g. SITE_URL=https://example.com
const siteUrl = (process.env.SITE_URL || '').trim().replace(/\/+$/, '');

const publicUrl = () => ({
  name: 'public-url',
  transformIndexHtml: {
    order: 'post',
    handler(html) {
      if (!siteUrl) return html;
      return html
        .replace(/(property="og:image" content=")[^"]*/, `$1${siteUrl}/img/og.jpg`)
        .replace(
          '</head>',
          `  <meta property="og:url" content="${siteUrl}/">\n  <link rel="canonical" href="${siteUrl}/">\n</head>`,
        );
    },
  },
});

export default defineConfig({
  // Relative paths, so the built site works from any folder on any host.
  base: './',
  server: { port: 5173, strictPort: true },
  plugins: [publicUrl()],
});
