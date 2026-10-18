import { useEffect, useState } from 'react';

/** False during prerender and the first client render; true afterwards. Use for values that legitimately differ (e.g. timings). */
export function useHydrated(): boolean {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}
