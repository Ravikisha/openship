"use client";

/**
 * Shared DNS-records grid. Renders the 4 required records (MX/SPF/DKIM/
 * DMARC) plus the 2 forward-looking client-autoconfig CNAMEs
 * (autodiscover/autoconfig) — synthesizing the latter from the domain if
 * the on-server state file doesn't carry them yet.
 *
 * Used in two places:
 *   - The DKIM hold banner (`/emails` page) while the install is paused.
 *   - The Mail tab's ProvisionedView (server detail page) as a permanent
 *     reference card — so the user can re-copy a record they botched at
 *     publication time without SSHing to the VPS to read the state file.
 *
 * Same component, same UX in both places (Type chip, short-form Name,
 * copy buttons).
 */

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import type { DnsRecord, DnsRecords } from "@/lib/api";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Convert an FQDN into the form DNS-provider UIs accept:
 *   - Root domain (`oblien.com` when domain=oblien.com) → `@`
 *   - Subdomain (`dkim._domainkey.oblien.com`)           → `dkim._domainkey`
 *   - Anything else                                      → as-is
 */
export function displayDnsName(fullName: string, domain: string): string {
  if (fullName === domain) return "@";
  if (fullName.endsWith(`.${domain}`)) {
    return fullName.slice(0, fullName.length - domain.length - 1);
  }
  return fullName;
}

/**
 * Fill in any client-autoconfig records the backend didn't provide. The
 * 2 CNAMEs are pure functions of the domain — no DKIM key dependency,
 * no per-install state — so we can synthesize them client-side instead
 * of forcing a reinstall to see them.
 *
 * For older installs whose `state.dnsRecords` only carries the 4 required
 * records. Newer installs include the CNAMEs on the backend; `??` keeps
 * those values verbatim.
 */
export function augmentDnsRecords(
  records: DnsRecords,
  domain: string,
): DnsRecords {
  const mailDomain = `mail.${domain}`;
  return {
    ...records,
    autodiscoverCname: records.autodiscoverCname ?? {
      type: "CNAME",
      name: `autodiscover.${domain}`,
      value: mailDomain,
      required: false,
    },
    autoconfigCname: records.autoconfigCname ?? {
      type: "CNAME",
      name: `autoconfig.${domain}`,
      value: mailDomain,
      required: false,
    },
  };
}

/** Iteration order: host records first, mail-delivery next, client-autoconfig last. */
export function recordsToList(records: DnsRecords): DnsRecord[] {
  return [
    records.a,
    records.aaaa,
    records.mx,
    records.spf,
    records.dkim,
    records.dmarc,
    records.autodiscoverCname,
    records.autoconfigCname,
  ].filter((r): r is DnsRecord => r !== undefined);
}

// ─── Components ──────────────────────────────────────────────────────────────

interface DnsRecordsViewProps {
  records: DnsRecords;
  domain: string;
  /** Grid columns at lg+. Default 2; pass 1 for a tighter sidebar layout. */
  columns?: 1 | 2;
}

/**
 * Self-contained grid of record cards. Drop into any container; takes
 * care of augmentation, iteration, and per-card UI.
 */
export function DnsRecordsView({
  records,
  domain,
  columns = 2,
}: DnsRecordsViewProps) {
  const full = augmentDnsRecords(records, domain);
  const rows = recordsToList(full);
  const colsClass = columns === 1 ? "grid-cols-1" : "grid-cols-1 lg:grid-cols-2";
  return (
    <div className={`grid ${colsClass} gap-3`}>
      {rows.map((rec, i) => (
        <DnsRecordCard key={i} rec={rec} domain={domain} />
      ))}
    </div>
  );
}

export function DnsRecordCard({
  rec,
  domain,
}: {
  rec: DnsRecord;
  domain: string;
}) {
  const [copied, setCopied] = useState<"name" | "value" | null>(null);
  const displayedName = displayDnsName(rec.name, domain);

  const copy = async (which: "name" | "value", text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      // Non-HTTPS context — silently no-op.
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border/60 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
          {rec.type}
        </span>
        {rec.type === "MX" && rec.priority !== undefined && (
          <span className="text-[11px] text-muted-foreground/70">
            priority {rec.priority}
          </span>
        )}
        {rec.required === false && (
          <span className="text-[11px] text-muted-foreground/70 ml-auto">
            recommended
          </span>
        )}
      </div>

      <div className="space-y-2 font-mono text-[12px]">
        <DnsRecordField
          fieldLabel="Name"
          value={displayedName}
          copied={copied === "name"}
          onCopy={() => copy("name", displayedName)}
        />
        <DnsRecordField
          fieldLabel="Value"
          value={rec.value}
          copied={copied === "value"}
          onCopy={() => copy("value", rec.value)}
        />
      </div>
    </div>
  );
}

function DnsRecordField({
  fieldLabel,
  value,
  copied,
  onCopy,
}: {
  fieldLabel: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[11px] text-muted-foreground/70 font-sans w-10 shrink-0 mt-0.5">
        {fieldLabel}
      </span>
      <div className="flex-1 min-w-0 bg-muted/40 rounded-md px-2 py-1.5 text-foreground/90 break-all">
        {value}
      </div>
      <button
        onClick={onCopy}
        className="text-muted-foreground/70 hover:text-foreground transition-colors p-1.5"
        title="Copy"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
    </div>
  );
}
