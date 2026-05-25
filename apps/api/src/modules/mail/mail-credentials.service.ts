/**
 * Mail-credentials operations — change the postmaster password after install.
 *
 * Flow:
 *   1. Hash the new password with `doveadm pw -s SSHA512` (the scheme
 *      iRedMail's default `dovecot-sql.conf` uses for the `password`
 *      column). Hashing on the target server avoids sending the
 *      cleartext or the hash through any intermediate process.
 *   2. UPDATE vmail.mailbox SET password = '<hash>' WHERE username = …
 *      via `sudo -u postgres psql`.
 *   3. Mirror the new cleartext into the on-server state file so the
 *      dashboard's Credentials card stays in sync.
 *
 * The state file's cleartext is convenience-only — the source of truth
 * for auth is the hash in `vmail.mailbox`. If the two ever drift (manual
 * SQL update outside openship), Dovecot honours the DB; the dashboard
 * just shows a stale string.
 */

import type { CommandExecutor } from "@repo/adapters";
import { readState, writeState } from "./mail-state";

/**
 * Shell-quote an arbitrary string so it survives as a single argv element
 * inside a `bash -c …` command. Wraps in single quotes and escapes any
 * embedded single quotes via the standard `'\''` trick.
 */
function shellQuote(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

/**
 * Hash a plaintext password via doveadm. Returns the `{SSHA512}...` string
 * ready to drop into the `password` column.
 */
async function hashWithDovecot(
  exec: CommandExecutor,
  plaintext: string,
): Promise<string> {
  const out = await exec.exec(
    `doveadm pw -s SSHA512 -p ${shellQuote(plaintext)}`,
  );
  const hash = out.trim();
  if (!hash.startsWith("{SSHA512}")) {
    throw new Error(
      `doveadm pw returned unexpected output: ${hash.slice(0, 60)}…`,
    );
  }
  return hash;
}

/**
 * Update the postmaster password for `<domain>`. Caller is responsible
 * for validation (length, etc.) — this function trusts the input.
 *
 * `domain` is the mail domain (e.g. "example.com"), NOT `mail.example.com`.
 * The postmaster account is always `postmaster@<domain>`.
 */
export async function updatePostmasterPassword(
  exec: CommandExecutor,
  domain: string,
  newPassword: string,
): Promise<void> {
  const username = `postmaster@${domain}`;
  const hash = await hashWithDovecot(exec, newPassword);

  // Sanity-check the values we're about to embed. Both come from controlled
  // sources (doveadm output + `postmaster@<validated-domain>`), so this is
  // belt-and-suspenders against an upstream surprise.
  if (!/^\{SSHA512\}[A-Za-z0-9+/=]+$/.test(hash)) {
    throw new Error("doveadm pw returned a hash with unexpected characters");
  }
  if (!/^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$/.test(username)) {
    throw new Error(`Refusing to update for suspicious username: ${username}`);
  }

  // iRedMail's pg_hba.conf grants the local `postgres` Unix user passwordless
  // access. Single-quote-wrap the SQL string literals — hash chars are
  // [A-Za-z0-9+/={}], username is similarly tame, so no escape gymnastics.
  const psqlCmd = `sudo -u postgres psql -d vmail -v ON_ERROR_STOP=1 -c "UPDATE mailbox SET password='${hash}' WHERE username='${username}';"`;
  await exec.exec(psqlCmd);

  // Mirror into the state file so the dashboard's Credentials card stays
  // in sync. Best-effort: if the state file is missing (operator deleted
  // it manually), we still consider the change successful — the DB is the
  // source of truth for actual auth.
  const state = await readState(exec);
  if (state) {
    await writeState(exec, {
      ...state,
      secrets: {
        ...state.secrets,
        DOMAIN_ADMIN_PASSWD_PLAIN: newPassword,
      },
    });
  }
}
