/** Router basename derived from Vite's BASE_URL ("/" or "/propchallenger/"). */
export const BASENAME = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '') || '/';
