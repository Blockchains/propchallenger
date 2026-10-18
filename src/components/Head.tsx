import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalFor, metaFor } from '../seo';

function setMeta(selector: string, create: () => HTMLElement, apply: (el: HTMLElement) => void) {
  let el = document.head.querySelector(selector) as HTMLElement | null;
  if (!el) { el = create(); document.head.appendChild(el); }
  apply(el);
}

/** Keeps title/description/canonical/robots in sync on client-side navigation. Prerender writes the same values statically. */
export function Head({ forceNoindex = false }: { forceNoindex?: boolean }) {
  const { pathname } = useLocation();
  useEffect(() => {
    const m = metaFor(pathname);
    document.title = m.title;
    setMeta('meta[name="description"]', () => Object.assign(document.createElement('meta'), { name: 'description' }), (el) => el.setAttribute('content', m.description));
    setMeta('link[rel="canonical"]', () => Object.assign(document.createElement('link'), { rel: 'canonical' }), (el) => el.setAttribute('href', canonicalFor(pathname)));
    const robots = m.noindex || forceNoindex ? 'noindex, follow' : 'index, follow';
    setMeta('meta[name="robots"]', () => Object.assign(document.createElement('meta'), { name: 'robots' }), (el) => el.setAttribute('content', robots));
  }, [pathname, forceNoindex]);
  return null;
}
