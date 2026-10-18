// Prerender every known route to static HTML so the site works on any static host
// (GitHub Pages project path or a custom-domain apex) with real content and 200 responses.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const { render, ROUTES, CANONICAL_ORIGIN } = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);

const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function page(routePath) {
  const { html, meta, canonical } = render(routePath);
  const head = [
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(canonical)}" />`,
    `<meta name="robots" content="${meta.noindex ? 'noindex, follow' : 'index, follow'}" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(canonical)}" />`,
    `<meta property="og:type" content="website" />`,
  ].join('\n    ');
  return {
    meta,
    out: template
      .replace('<!--head-meta-->', head)
      .replace(/<title>.*?<\/title>/, `<title>${esc(meta.title)}</title>`)
      .replace('<!--app-html-->', html),
  };
}

const sitemap = [];
for (const r of ROUTES) {
  const { out, meta } = page(r);
  const file = r === '/' ? path.join(dist, 'index.html') : path.join(dist, r.replace(/^\//, ''), 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, out);
  if (meta.inSitemap) sitemap.push(`${CANONICAL_ORIGIN}${r}`);
  console.log(`prerendered ${r} -> ${path.relative(root, file)}`);
}
fs.writeFileSync(path.join(dist, '404.html'), page('/__not-found__').out);
fs.writeFileSync(
  path.join(dist, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`,
);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${CANONICAL_ORIGIN}/sitemap.xml\n`);
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
if (process.env.CUSTOM_DOMAIN) {
  fs.writeFileSync(path.join(dist, 'CNAME'), `${process.env.CUSTOM_DOMAIN.trim()}\n`);
  console.log(`wrote CNAME ${process.env.CUSTOM_DOMAIN.trim()}`);
}
console.log(`sitemap: ${sitemap.length} URL(s)`);
