/**
 * Single source of truth for the Zero server URL.
 *
 * Resolution order:
 *   1. `import.meta.env.VITE_PUBLIC_BACKEND_URL` — Vite inlines this at
 *      build time from `.env*` / wrangler `vars`. Always wins when set.
 *   2. In DEV only: `http://localhost:3030`. Matches the default port
 *      from `apps/email/server/src/env.ts` so `bun dev` works without
 *      configuration. (The cloudflare vite plugin doesn't propagate
 *      `.env.development` to the SSR worker, so without this fallback
 *      SSR requests POST to "/undefined/api/trpc/...".)
 *   3. In PROD: throw. A misconfigured deploy that ships pointing at
 *      localhost is worse than failing loud — the worker would emit
 *      runtime errors on every request anyway, but a thrown error at
 *      module load surfaces the misconfig as soon as the route renders
 *      instead of hiding it in network noise.
 */

const DEV_FALLBACK = 'http://localhost:3030';

function resolve(): string {
  const fromEnv = import.meta.env.VITE_PUBLIC_BACKEND_URL as string | undefined;
  if (fromEnv && fromEnv !== 'undefined') return fromEnv;
  if (import.meta.env.DEV) return DEV_FALLBACK;
  throw new Error(
    'VITE_PUBLIC_BACKEND_URL is not set. Production builds require this to be ' +
      'injected at build time via wrangler `vars` or the deploy env.',
  );
}

export const BACKEND_URL = resolve();
export const TRPC_URL = `${BACKEND_URL}/api/trpc`;
