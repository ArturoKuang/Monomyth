import { defineConfig } from 'vite';
import type { Plugin, UserConfig } from 'vite';

export function publicEnvironmentGuard(environment: NodeJS.ProcessEnv): void {
  const allowed = new Set(['VITE_APP_TITLE']);
  const unexpected = Object.keys(environment).filter(
    (key) => key.startsWith('VITE_') && !allowed.has(key),
  );
  if (unexpected.length > 0) {
    throw new Error(`Unapproved public environment variable names: ${unexpected.join(', ')}`);
  }
}

export function browserBoundaryGuard(): Plugin {
  return {
    name: 'browser-server-boundary',
    enforce: 'pre',
    resolveId(source) {
      if (/\.server(?:\.|$)/u.test(source) || source.startsWith('node:')) {
        throw new Error('Server-only module requested by the browser build.');
      }
      return null;
    },
  };
}

export default defineConfig((): UserConfig => {
  publicEnvironmentGuard(process.env);
  return {
    // Only explicitly supplied public values are read; local secret files are never loaded.
    envDir: false,
    envPrefix: 'VITE_',
    plugins: [browserBoundaryGuard()],
    server: { host: '127.0.0.1' },
    preview: { host: '127.0.0.1', port: 4173, strictPort: true },
    build: { sourcemap: false, target: 'es2022' },
  };
});
