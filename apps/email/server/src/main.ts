/**
 * Zero server entrypoint.
 *
 * Hono + Bun. Mounts:
 *   /auth/*      sign-in / sign-out / session
 *   /mail/idle   SSE bridge to IMAP IDLE
 *   /trpc/*      tRPC over HTTP (all the things)
 *
 * Bootstraps an SSE-friendly CORS policy so the client running on a
 * different origin (default :3000 → :3001) can hold the IDLE
 * connection open with credentials.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getCookie } from 'hono/cookie';
import { secureHeaders } from 'hono/secure-headers';
import { bodyLimit } from 'hono/body-limit';
import { trpcServer } from '@hono/trpc-server';
import { serveStatic } from 'hono/bun';
import { env } from './env';
import { authRoutes } from './routes/auth';
import { idleRoute } from './routes/idle';
import { appRouter } from './trpc';
import { buildContext } from './ctx';
import { getSession } from './lib/session';
import { getBranding, assetsDir } from './lib/branding';
import { brandingAdminRoute } from './routes/branding-admin';

const app = new Hono();

app.use('*', logger());

// Defense-in-depth HTTP response headers. We're primarily an API server,
// so we deliberately leave CSP unset (the only HTML we ever return is
// the branding JSON / 404 pages, never a UI). Everything else hardens
// against clickjacking, MIME sniffing, and referrer leaks. HSTS is only
// meaningful behind HTTPS — hono's middleware no-ops it on plain HTTP.
app.use(
  '*',
  secureHeaders({
    xFrameOptions: 'DENY',
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'strict-origin-when-cross-origin',
    strictTransportSecurity: 'max-age=31536000; includeSubDomains',
    xPermittedCrossDomainPolicies: 'none',
    crossOriginOpenerPolicy: 'same-origin',
    crossOriginResourcePolicy: 'same-site',
  }),
);

// 25 MB cap on request bodies. Covers the largest plausible email
// attachment payload (most SMTP servers reject anything bigger anyway)
// and prevents a single client from OOM'ing the process by streaming
// a multi-gigabyte JSON.
app.use(
  '*',
  bodyLimit({
    maxSize: 25 * 1024 * 1024,
    onError: (c) => c.json({ error: 'Request body too large' }, 413),
  }),
);

app.use(
  '*',
  cors({
    origin: env.TRUSTED_ORIGINS,
    credentials: true,
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

app.get('/health', (c) => c.json({ ok: true, version: '0.2.0' }));

// Plain JSON branding config — no tRPC envelope, no auth. Reads
// from ${BRANDING_PATH}/config.json via the filesystem-backed store.
// Consumers (Zero client, openship dashboard) can fetch this without
// going through tRPC; useful for static HTML/SSR and curl.
app.get('/branding.json', (c) => c.json(getBranding()));

// Logo / favicon / future uploads — served from ${BRANDING_PATH}/assets/.
// hono/bun's serveStatic resolves the file from `${root}/${path-after-rewrite}`.
app.use(
  '/branding/assets/*',
  serveStatic({
    root: assetsDir(),
    rewriteRequestPath: (p) => p.replace(/^\/branding\/assets\//, '/'),
  }),
);

app.route('/auth', authRoutes);
app.route('/mail', idleRoute);
// Token-gated write API for branding. Openship's dashboard PATCHes
// here using the shared BRANDING_ADMIN_TOKEN. Reads (`/branding.json`)
// stay unauthenticated for the login page.
app.route('/admin', brandingAdminRoute);

// The upstream Zero client posts to /api/trpc; we keep /trpc as a
// convenience for curl + the openship dashboard. `endpoint` MUST match
// the mount point — the hono adapter uses it to strip the prefix
// before resolving the procedure name.
const createTrpcContext = async (_opts: unknown, c: any) => {
  const sid = getCookie(c, env.SESSION_COOKIE_NAME);
  const session = sid ? await getSession(sid) : null;
  return { ...buildContext(session, c) };
};
// allowMethodOverride: the client uses `methodOverride: 'POST'` so EVERY
// procedure call goes out as POST (queries and mutations alike). Without
// this flag, @trpc/server rejects POST-to-query with
// `METHOD_NOT_SUPPORTED` (HTTP 405), which is what every load-time
// dashboard request hit.
app.use(
  '/trpc/*',
  trpcServer({
    router: appRouter,
    endpoint: '/trpc',
    createContext: createTrpcContext,
    allowMethodOverride: true,
  }),
);
app.use(
  '/api/trpc/*',
  trpcServer({
    router: appRouter,
    endpoint: '/api/trpc',
    createContext: createTrpcContext,
    allowMethodOverride: true,
  }),
);

const port = env.PORT;
console.log(`[zero] listening on http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
