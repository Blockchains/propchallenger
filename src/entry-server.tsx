import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { App } from './App';
import { BASENAME } from './basename';
import { canonicalFor, metaFor, ROUTE_META } from './seo';
export { CANONICAL_ORIGIN } from './seo';

export function render(path: string) {
  const url = BASENAME === '/' ? path : `${BASENAME}${path === '/' ? '/' : path}`;
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url} basename={BASENAME}>
        <App />
      </StaticRouter>
    </StrictMode>,
  );
  const meta = metaFor(path);
  return { html, meta, canonical: canonicalFor(path) };
}

export const ROUTES = Object.keys(ROUTE_META);
