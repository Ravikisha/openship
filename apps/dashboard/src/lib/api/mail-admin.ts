/**
 * Mail admin API client — domain / mailbox / alias CRUD against the
 * vmail schema on the provisioned mail server.
 *
 * One namespace per entity (domains, mailboxes). Each call returns a typed
 * DTO that mirrors the backend's `apps/api/src/modules/mail/admin/*.service`
 * row shapes. The /emails admin tabs consume these directly.
 */

import { api } from "./client";
import { endpoints } from "./endpoints";

// ─── Domains ─────────────────────────────────────────────────────────────────

export interface AdminDomain {
  domain: string;
  description: string;
  /** Current count of active mailboxes for this domain. */
  mailboxes: number;
  /** Current count of active aliases. */
  aliases: number;
  /** Domain-wide cap (0 = unlimited). The upstream schema conflates "count" and "max"
   *  on the same columns; both keys point at the same data so callers can
   *  pick the more intentional one. */
  maxMailboxes: number;
  maxAliases: number;
  /** Default per-mailbox quota cap in MB (0 = unlimited). */
  defaultQuotaMB: number;
  active: boolean;
  createdAt: string;
}

export interface CreateDomainPayload {
  domain: string;
  description?: string;
  maxMailboxes?: number;
  maxAliases?: number;
  defaultQuotaMB?: number;
}

export interface UpdateDomainPayload {
  description?: string;
  maxMailboxes?: number;
  maxAliases?: number;
  defaultQuotaMB?: number;
  active?: boolean;
}

export interface DomainDependents {
  mailboxes: number;
  aliases: number;
}

// ─── Mailboxes ───────────────────────────────────────────────────────────────

export interface AdminMailbox {
  username: string;
  name: string;
  domain: string;
  /** In megabytes — UI converts to GB for display. 0 = unlimited. */
  quotaMB: number;
  storagebasedirectory: string;
  storagenode: string;
  maildir: string;
  active: boolean;
  isAdmin: boolean;
  isGlobalAdmin: boolean;
  createdAt: string;
  passwordLastChange: string;
}

export interface CreateMailboxPayload {
  localPart: string;
  domain: string;
  password: string;
  name?: string;
  quotaMB?: number;
}

export interface UpdateMailboxPayload {
  name?: string;
  /** Plaintext — backend hashes via doveadm. */
  password?: string;
  quotaMB?: number;
  active?: boolean;
}

// ─── Stats ───────────────────────────────────────────────────────────────────

export interface MailServerStats {
  domains: { total: number; active: number };
  mailboxes: { total: number; active: number };
  aliases: { total: number };
  /** Aggregated bytes from vmail.used_quota. May be stale by one IMAP
   *  session — Dovecot updates the row on LOGOUT, not in real time. */
  storageBytes: number;
  messages: number;
}

// ─── DNS scan ────────────────────────────────────────────────────────────────

export type DnsCheckStatus = "pass" | "warn" | "fail" | "unknown";

export interface DnsCheck {
  key: string;
  label: string;
  description: string;
  queriedName: string;
  recordType: string;
  status: DnsCheckStatus;
  expected: string;
  actual: string;
  message: string;
}

export interface DnsScanResult {
  domain: string;
  scannedAt: number;
  checks: DnsCheck[];
}

// ─── Client ──────────────────────────────────────────────────────────────────

export const mailAdminApi = {
  domains: {
    list: (serverId: string) =>
      api.get<{ domains: AdminDomain[] }>(endpoints.mail.admin.domains(serverId)),
    get: (serverId: string, domain: string) =>
      api.get<{ domain: AdminDomain }>(endpoints.mail.admin.domain(serverId, domain)),
    create: (serverId: string, payload: CreateDomainPayload) =>
      api.post<{ domain: AdminDomain }>(
        endpoints.mail.admin.domains(serverId),
        payload,
      ),
    update: (serverId: string, domain: string, patch: UpdateDomainPayload) =>
      api.patch<{ domain: AdminDomain }>(
        endpoints.mail.admin.domain(serverId, domain),
        patch,
      ),
    delete: (serverId: string, domain: string) =>
      api.delete<{ ok: boolean }>(endpoints.mail.admin.domain(serverId, domain)),
    dependents: (serverId: string, domain: string) =>
      api.get<DomainDependents>(
        endpoints.mail.admin.domainDependents(serverId, domain),
      ),
  },
  mailboxes: {
    list: (serverId: string, domain: string) =>
      api.get<{ mailboxes: AdminMailbox[] }>(
        `${endpoints.mail.admin.mailboxes(serverId)}?domain=${encodeURIComponent(domain)}`,
      ),
    get: (serverId: string, email: string) =>
      api.get<{ mailbox: AdminMailbox }>(
        endpoints.mail.admin.mailbox(serverId, email),
      ),
    create: (serverId: string, payload: CreateMailboxPayload) =>
      api.post<{ mailbox: AdminMailbox }>(
        endpoints.mail.admin.mailboxes(serverId),
        payload,
      ),
    update: (serverId: string, email: string, patch: UpdateMailboxPayload) =>
      api.patch<{ mailbox: AdminMailbox }>(
        endpoints.mail.admin.mailbox(serverId, email),
        patch,
      ),
    softDelete: (serverId: string, email: string) =>
      api.delete<{ ok: boolean; mode: "soft" | "hard" }>(
        endpoints.mail.admin.mailbox(serverId, email),
      ),
    hardDelete: (serverId: string, email: string) =>
      api.delete<{ ok: boolean; mode: "soft" | "hard" }>(
        `${endpoints.mail.admin.mailbox(serverId, email)}?hard=true`,
      ),
  },
  stats: {
    get: (serverId: string) =>
      api.get<MailServerStats>(endpoints.mail.admin.stats(serverId)),
  },
  dns: {
    scan: (serverId: string) =>
      api.get<DnsScanResult>(endpoints.mail.admin.dnsScan(serverId)),
  },
};
