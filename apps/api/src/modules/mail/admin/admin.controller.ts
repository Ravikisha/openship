/**
 * HTTP handlers for the mail admin panel.
 *
 * Thin layer over the service files in this folder — validates input,
 * extracts path / query params, calls the service, maps known errors to
 * 4xx responses. No business logic lives here.
 *
 * All routes are mounted under `/api/mail/admin/:serverId/…` in
 * `../mail.routes.ts` behind `localOnly` + `authMiddleware`.
 */

import type { Context } from "hono";
import { env } from "../../../config";
import {
  countDomainDependents,
  createDomain,
  deleteDomain,
  DomainExistsError,
  DomainHasDependentsError,
  DomainNotFoundError,
  getDomain,
  listDomains,
  updateDomain,
  validateDomain,
} from "./domains.service";
import {
  createMailbox,
  hardDeleteMailbox,
  getMailbox,
  listMailboxes,
  MailboxExistsError,
  MailboxNotFoundError,
  softDeleteMailbox,
  updateMailbox,
} from "./mailboxes.service";
import { getMailServerStats } from "./stats.service";
import { scanDns } from "./dns-scan.service";

function localOnlyGuard(c: Context): Response | null {
  if (env.CLOUD_MODE) {
    return c.json({ error: "Not available in cloud mode" }, 404);
  }
  return null;
}

function getActingAdmin(c: Context): string {
  const user = c.get("user") as { email?: string; name?: string; id?: string } | undefined;
  return user?.email || user?.name || user?.id || "unknown";
}

function requireServerId(c: Context): string {
  const id = c.req.param("serverId");
  if (!id) throw new Error("serverId is required");
  return id;
}

// ─── Domains ─────────────────────────────────────────────────────────────────

export async function listDomainsHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  try {
    const rows = await listDomains(serverId);
    return c.json({ domains: rows });
  } catch (err) {
    return errorJson(c, err);
  }
}

export async function getDomainHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const domain = c.req.param("domain");
  if (!domain) return c.json({ error: "domain required" }, 400);
  try {
    const row = await getDomain(serverId, domain);
    if (!row) return c.json({ error: "Domain not found" }, 404);
    return c.json({ domain: row });
  } catch (err) {
    return errorJson(c, err);
  }
}

export async function createDomainHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const body = await c.req.json().catch(() => ({}));
  try {
    const row = await createDomain(serverId, {
      domain: String(body.domain ?? ""),
      description: body.description ? String(body.description) : undefined,
      maxMailboxes: body.maxMailboxes != null ? Number(body.maxMailboxes) : undefined,
      maxAliases: body.maxAliases != null ? Number(body.maxAliases) : undefined,
      defaultQuotaMB: body.defaultQuotaMB != null ? Number(body.defaultQuotaMB) : undefined,
    });
    return c.json({ domain: row }, 201);
  } catch (err) {
    if (err instanceof DomainExistsError) {
      return c.json({ error: err.message }, 409);
    }
    return errorJson(c, err);
  }
}

export async function updateDomainHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const domain = c.req.param("domain");
  if (!domain) return c.json({ error: "domain required" }, 400);
  const body = await c.req.json().catch(() => ({}));
  try {
    const row = await updateDomain(serverId, domain, {
      description: body.description != null ? String(body.description) : undefined,
      maxMailboxes: body.maxMailboxes != null ? Number(body.maxMailboxes) : undefined,
      maxAliases: body.maxAliases != null ? Number(body.maxAliases) : undefined,
      defaultQuotaMB: body.defaultQuotaMB != null ? Number(body.defaultQuotaMB) : undefined,
      active: body.active != null ? Boolean(body.active) : undefined,
    });
    return c.json({ domain: row });
  } catch (err) {
    if (err instanceof DomainNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return errorJson(c, err);
  }
}

export async function deleteDomainHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const domain = c.req.param("domain");
  if (!domain) return c.json({ error: "domain required" }, 400);
  try {
    await deleteDomain(serverId, domain);
    return c.json({ ok: true });
  } catch (err) {
    if (err instanceof DomainHasDependentsError) {
      return c.json(
        { error: err.message, dependents: err.dependents },
        409,
      );
    }
    return errorJson(c, err);
  }
}

export async function domainDependentsHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const domain = c.req.param("domain");
  if (!domain) return c.json({ error: "domain required" }, 400);
  try {
    validateDomain(domain);
    const deps = await countDomainDependents(serverId, domain);
    return c.json(deps);
  } catch (err) {
    return errorJson(c, err);
  }
}

// ─── Mailboxes ───────────────────────────────────────────────────────────────

export async function listMailboxesHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const domain = c.req.query("domain");
  if (!domain) return c.json({ error: "domain query param required" }, 400);
  try {
    const rows = await listMailboxes(serverId, domain);
    return c.json({ mailboxes: rows });
  } catch (err) {
    return errorJson(c, err);
  }
}

export async function getMailboxHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const email = c.req.param("email");
  if (!email) return c.json({ error: "email required" }, 400);
  try {
    const row = await getMailbox(serverId, email);
    if (!row) return c.json({ error: "Mailbox not found" }, 404);
    return c.json({ mailbox: row });
  } catch (err) {
    return errorJson(c, err);
  }
}

export async function createMailboxHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const body = await c.req.json().catch(() => ({}));
  try {
    const row = await createMailbox(serverId, {
      localPart: String(body.localPart ?? ""),
      domain: String(body.domain ?? ""),
      password: String(body.password ?? ""),
      name: body.name ? String(body.name) : undefined,
      quotaMB: body.quotaMB != null ? Number(body.quotaMB) : undefined,
    });
    return c.json({ mailbox: row }, 201);
  } catch (err) {
    if (err instanceof MailboxExistsError) {
      return c.json({ error: err.message }, 409);
    }
    return errorJson(c, err);
  }
}

export async function updateMailboxHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const email = c.req.param("email");
  if (!email) return c.json({ error: "email required" }, 400);
  const body = await c.req.json().catch(() => ({}));
  try {
    const row = await updateMailbox(serverId, email, {
      name: body.name != null ? String(body.name) : undefined,
      password: body.password ? String(body.password) : undefined,
      quotaMB: body.quotaMB != null ? Number(body.quotaMB) : undefined,
      active: body.active != null ? Boolean(body.active) : undefined,
    });
    return c.json({ mailbox: row });
  } catch (err) {
    if (err instanceof MailboxNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return errorJson(c, err);
  }
}

export async function deleteMailboxHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  const email = c.req.param("email");
  if (!email) return c.json({ error: "email required" }, 400);
  const hard = c.req.query("hard") === "true";

  try {
    if (hard) {
      await hardDeleteMailbox(serverId, email);
    } else {
      await softDeleteMailbox(serverId, email, getActingAdmin(c));
    }
    return c.json({ ok: true, mode: hard ? "hard" : "soft" });
  } catch (err) {
    if (err instanceof MailboxNotFoundError) {
      return c.json({ error: err.message }, 404);
    }
    return errorJson(c, err);
  }
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export async function getStatsHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  try {
    const stats = await getMailServerStats(serverId);
    return c.json(stats);
  } catch (err) {
    return errorJson(c, err);
  }
}

// ─── DNS health scan ─────────────────────────────────────────────────────────

export async function getDnsScanHandler(c: Context) {
  const guard = localOnlyGuard(c);
  if (guard) return guard;
  const serverId = requireServerId(c);
  try {
    const result = await scanDns(serverId);
    return c.json(result);
  } catch (err) {
    return errorJson(c, err);
  }
}

// ─── Error mapping ───────────────────────────────────────────────────────────

function errorJson(c: Context, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  // The SSH+psql layer throws plain Error for any non-shape error
  // (connection failure, SQL syntax, validation). 500 is the right default;
  // typed errors above are caught and mapped to 4xx individually.
  return c.json({ error: message }, 500);
}
