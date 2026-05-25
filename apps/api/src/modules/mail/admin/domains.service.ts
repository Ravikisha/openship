/**
 * Domain CRUD for the mail admin panel.
 *
 * Wraps `vmail.domain` operations. The install creates the first domain
 * automatically (the one the operator entered in the wizard) — this module
 * lets them add more, list them with mailbox/alias counts, and remove them.
 *
 * Counters: `vmail.domain.mailboxes` and `vmail.domain.aliases` are
 * application-managed counters in iRedMail (not triggers). We keep them in
 * sync inside create/update/delete operations by recounting from the
 * authoritative `mailbox` / `forwardings` tables.
 */

import { execute, queryOne, queryRows, q, qInt } from "./psql-runner";

const DOMAIN_RE = /^[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)+$/i;

export interface DomainRow {
  domain: string;
  description: string;
  mailboxes: number;
  aliases: number;
  /** Domain-wide max (0 = unlimited). */
  maxMailboxes: number;
  maxAliases: number;
  /** Default per-mailbox quota in MB (0 = no per-domain cap). */
  defaultQuotaMB: number;
  active: boolean;
  createdAt: string;
}

export interface CreateDomainInput {
  domain: string;
  description?: string;
  maxMailboxes?: number;
  maxAliases?: number;
  defaultQuotaMB?: number;
}

export interface UpdateDomainInput {
  description?: string;
  maxMailboxes?: number;
  maxAliases?: number;
  defaultQuotaMB?: number;
  active?: boolean;
}

const SELECT_COLUMNS = `
  domain,
  description,
  mailboxes,
  aliases,
  mailboxes AS "maxMailboxes",
  aliases AS "maxAliases",
  maxquota AS "defaultQuotaMB",
  (active = 1) AS active,
  created::text AS "createdAt"
`;

/**
 * Note on counter columns: iRedMail overloads `vmail.domain.mailboxes` and
 * `.aliases` — they're used BOTH as the upper-limit cap AND as a live count.
 * iRedAdmin updates them on every create/delete. We follow that convention.
 * The "live count" is what we want to surface in the UI as `mailboxes` /
 * `aliases`, so we return them under those names. The `max*` aliases in
 * the SELECT above are pre-existing iRedAdmin terminology — we keep both
 * shapes so client-side code can read either intent without ambiguity.
 *
 * For now the UI doesn't differentiate "current count" vs "max" because
 * iRedMail conflates them. If we later split them apart we'd add an
 * `openship_meta` table on the mail VPS (NOT on openship's DB).
 */

export function validateDomain(domain: string): void {
  const d = domain.trim().toLowerCase();
  if (!DOMAIN_RE.test(d) || d.length > 255) {
    throw new Error(`Invalid domain: ${domain}`);
  }
}

export async function listDomains(serverId: string): Promise<DomainRow[]> {
  return queryRows<DomainRow>(
    serverId,
    `SELECT${SELECT_COLUMNS} FROM domain ORDER BY domain`,
  );
}

export async function getDomain(
  serverId: string,
  domain: string,
): Promise<DomainRow | null> {
  validateDomain(domain);
  return queryOne<DomainRow>(
    serverId,
    `SELECT${SELECT_COLUMNS} FROM domain WHERE domain = ${q(domain.toLowerCase())}`,
  );
}

export async function createDomain(
  serverId: string,
  input: CreateDomainInput,
): Promise<DomainRow> {
  validateDomain(input.domain);
  const domain = input.domain.toLowerCase();

  // Duplicate check is implicit (PRIMARY KEY) but we surface a friendlier
  // error than psql's `duplicate key value violates unique constraint`.
  const existing = await getDomain(serverId, domain);
  if (existing) {
    throw new DomainExistsError(domain);
  }

  await execute(
    serverId,
    `INSERT INTO domain (
        domain, description,
        mailboxes, aliases, maxquota,
        active, created, modified
      ) VALUES (
        ${q(domain)},
        ${q(input.description ?? "")},
        ${qInt(input.maxMailboxes ?? 0)},
        ${qInt(input.maxAliases ?? 0)},
        ${qInt(input.defaultQuotaMB ?? 0)},
        1, NOW(), NOW()
      )`,
  );

  const row = await getDomain(serverId, domain);
  if (!row) throw new Error(`createDomain: row not found after INSERT for ${domain}`);
  return row;
}

export async function updateDomain(
  serverId: string,
  domain: string,
  patch: UpdateDomainInput,
): Promise<DomainRow> {
  validateDomain(domain);
  const d = domain.toLowerCase();

  const sets: string[] = ["modified = NOW()"];
  if (patch.description !== undefined) {
    sets.push(`description = ${q(patch.description)}`);
  }
  if (patch.maxMailboxes !== undefined) {
    sets.push(`mailboxes = ${qInt(patch.maxMailboxes)}`);
  }
  if (patch.maxAliases !== undefined) {
    sets.push(`aliases = ${qInt(patch.maxAliases)}`);
  }
  if (patch.defaultQuotaMB !== undefined) {
    sets.push(`maxquota = ${qInt(patch.defaultQuotaMB)}`);
  }
  if (patch.active !== undefined) {
    sets.push(`active = ${patch.active ? 1 : 0}`);
  }

  if (sets.length === 1) {
    // Nothing to update — return current row without an UPDATE.
    const row = await getDomain(serverId, d);
    if (!row) throw new DomainNotFoundError(d);
    return row;
  }

  await execute(
    serverId,
    `UPDATE domain SET ${sets.join(", ")} WHERE domain = ${q(d)}`,
  );

  const row = await getDomain(serverId, d);
  if (!row) throw new DomainNotFoundError(d);
  return row;
}

/**
 * Count active mailboxes + aliases that would be orphaned by deleting this
 * domain. Returns 0 when the domain is safe to drop.
 */
export async function countDomainDependents(
  serverId: string,
  domain: string,
): Promise<{ mailboxes: number; aliases: number }> {
  validateDomain(domain);
  const d = domain.toLowerCase();
  const row = await queryOne<{ mailboxes: number; aliases: number }>(
    serverId,
    `SELECT
       (SELECT COUNT(*)::int FROM mailbox WHERE domain = ${q(d)}) AS mailboxes,
       (SELECT COUNT(*)::int FROM forwardings WHERE domain = ${q(d)} AND is_alias = 1) AS aliases`,
  );
  return row ?? { mailboxes: 0, aliases: 0 };
}

/**
 * Delete a domain. Refuses if any mailboxes or aliases still exist for it
 * (caller should empty those first). Removes the row + any `domain_admins`
 * mappings.
 */
export async function deleteDomain(
  serverId: string,
  domain: string,
): Promise<void> {
  validateDomain(domain);
  const d = domain.toLowerCase();

  const deps = await countDomainDependents(serverId, d);
  if (deps.mailboxes > 0 || deps.aliases > 0) {
    throw new DomainHasDependentsError(d, deps);
  }

  await execute(
    serverId,
    `DELETE FROM domain_admins WHERE domain = ${q(d)};
     DELETE FROM domain WHERE domain = ${q(d)};`,
  );
}

/**
 * Recalculate `vmail.domain.mailboxes` / `.aliases` from the source tables.
 * Called by mailbox/alias services after mutations so the counters stay
 * accurate even when iRedMail's own scripts touch the tables outside our
 * UI.
 */
export async function recountDomain(
  serverId: string,
  domain: string,
): Promise<void> {
  validateDomain(domain);
  const d = domain.toLowerCase();
  await execute(
    serverId,
    `UPDATE domain SET
       mailboxes = (SELECT COUNT(*) FROM mailbox WHERE domain = ${q(d)} AND active = 1),
       aliases   = (SELECT COUNT(*) FROM forwardings WHERE domain = ${q(d)} AND is_alias = 1 AND active = 1),
       modified  = NOW()
     WHERE domain = ${q(d)}`,
  );
}

// ─── Typed errors ────────────────────────────────────────────────────────────

export class DomainExistsError extends Error {
  constructor(public domain: string) {
    super(`Domain already exists: ${domain}`);
  }
}

export class DomainNotFoundError extends Error {
  constructor(public domain: string) {
    super(`Domain not found: ${domain}`);
  }
}

export class DomainHasDependentsError extends Error {
  constructor(
    public domain: string,
    public dependents: { mailboxes: number; aliases: number },
  ) {
    super(
      `Domain ${domain} still has ${dependents.mailboxes} mailbox(es) and ${dependents.aliases} alias(es). Remove them first.`,
    );
  }
}
