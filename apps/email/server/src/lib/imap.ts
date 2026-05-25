/**
 * IMAP client helpers — wraps `imapflow`.
 *
 * Each request opens a short-lived IMAP connection. On the same VPS
 * the TCP+TLS handshake against Dovecot is sub-millisecond — pooling
 * adds complexity for no win at the scale of self-hosted webmail
 * (typically one operator's mailboxes, not thousands).
 *
 * The IDLE listener in `routes/idle.ts` is the one place that holds a
 * connection open; it lives outside this helper.
 */

import { ImapFlow } from 'imapflow';

export interface ImapAuth {
  host: string;
  port: number;
  user: string;
  pass: string;
}

/**
 * Open a fresh IMAP connection, run `fn`, then close it. The connection
 * is always closed even if `fn` throws.
 *
 * Use this for one-shot operations (list / get / flag). For long-lived
 * IDLE, manage the ImapFlow lifecycle directly.
 */
export async function withImap<T>(
  auth: ImapAuth,
  fn: (client: ImapFlow) => Promise<T>,
): Promise<T> {
  const client = new ImapFlow({
    host: auth.host,
    port: auth.port,
    secure: auth.port === 993,
    auth: { user: auth.user, pass: auth.pass },
    logger: false,
  });

  await client.connect();
  try {
    return await fn(client);
  } catch (err: any) {
    // imapflow throws `new Error('Command failed')` for any NO/BAD response,
    // attaching the actual server text on `responseText` and the wire-format
    // command on `executedCommand`. Surface both so tRPC errors are
    // actionable instead of a bare "Command failed".
    if (err && typeof err === 'object' && err.message === 'Command failed') {
      const detail = [err.responseText, err.executedCommand].filter(Boolean).join(' :: ');
      if (detail) err.message = `IMAP command failed: ${detail}`;
    }
    throw err;
  } finally {
    try {
      await client.logout();
    } catch {
      /* close-on-shutdown best effort */
    }
  }
}

/**
 * Quick credential check: opens an IMAP connection and immediately
 * closes it. Returns true on successful AUTHENTICATE. Used by the
 * `/auth/login` endpoint.
 */
export async function probeImap(auth: ImapAuth): Promise<boolean> {
  try {
    await withImap(auth, async () => {
      // connection succeeded; nothing else to do.
    });
    return true;
  } catch {
    return false;
  }
}
