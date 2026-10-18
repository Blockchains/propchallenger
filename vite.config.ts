import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH controls where the static build is served from.
//   GitHub Pages project site: BASE_PATH=/propchallenger/
//   Custom domain apex (propchallenger.com, prop.grok.me): BASE_PATH=/ (default)
const rawBase = process.env.BASE_PATH ?? '/';
const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

export default defineConfig({
  base,
  plugins: [react()],
  build: { sourcemap: true },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
} as Parameters<typeof defineConfig>[0]);
