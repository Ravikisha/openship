"use client";

/**
 * Mail tab on the server detail page.
 *
 * Server-context only — does NOT duplicate the full Mail admin panel
 * that lives at `/emails`. That's where credentials, mailbox CRUD,
 * health checks, DNS, and tutorials live. This tab is just a directory
 * entry: "yes, this server is provisioned for mail (or isn't)" + a
 * single big CTA to open the real admin.
 *
 * Two states:
 *   - Not provisioned for this server → install CTA → /emails wizard.
 *   - Provisioned                     → status summary + "Open Mail admin".
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CircleAlert,
  CircleDashed,
  Mail,
} from "lucide-react";
import {
  mailApi,
  type MailComponentHealth,
  type MailSetupStatus,
} from "@/lib/api";

interface MailTabProps {
  serverId: string;
  /** Whether the server also runs apps — affects copy. */
  runsApps: boolean;
}

/**
 * "Provisioned for this server" = the last finished setup targeted us AND
 * every step completed cleanly. Anything else (running, failed, targeted a
 * different server, never ran) falls through to the install card.
 */
function isProvisionedFor(
  status: MailSetupStatus | null,
  serverId: string,
): boolean {
  if (!status) return false;
  if (status.active) return false;
  if (status.serverId !== serverId) return false;
  if (!status.finishedAt) return false;
  if (!status.steps?.length) return false;
  return status.steps.every((s) => s.status === "completed");
}

export function MailTab({ serverId, runsApps }: MailTabProps) {
  const [status, setStatus] = useState<MailSetupStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await mailApi.getStatus(serverId);
        if (!cancelled) setStatus(s);
      } catch {
        // No status endpoint reachable (cloud mode, network blip) — stay
        // in the install card; that's safe regardless of actual state.
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  if (loading) return <MailTabSkeleton />;

  if (isProvisionedFor(status, serverId)) {
    return <ProvisionedSummary status={status!} serverId={serverId} />;
  }

  return <InstallCallout serverId={serverId} runsApps={runsApps} />;
}

// ─── Loading ─────────────────────────────────────────────────────────────────

function MailTabSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 animate-pulse">
      <div className="h-16 bg-muted/40 rounded-xl" />
    </div>
  );
}

// ─── Not provisioned ─────────────────────────────────────────────────────────

function InstallCallout({
  serverId,
  runsApps,
}: {
  serverId: string;
  runsApps: boolean;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Mail
              className="size-[18px] text-muted-foreground"
              strokeWidth={2}
            />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] font-semibold text-foreground">
              Mail server
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              {runsApps
                ? "This server is configured to run apps and email side by side. The mail stack installs separately from the app components."
                : "This server is dedicated to email. Run the provisioner to install the full mail stack."}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-2">
              Installs: Postfix, Dovecot, Amavis, ClamAV, SpamAssassin, a
              policy daemon, fail2ban, PostgreSQL, and Let's Encrypt.
            </p>
          </div>
        </div>
        <Link
          href={`/emails?serverId=${encodeURIComponent(serverId)}`}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
        >
          Provision
          <ArrowRight className="size-3.5" strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  );
}

// ─── Provisioned summary ─────────────────────────────────────────────────────

function ProvisionedSummary({
  status,
  serverId,
}: {
  status: MailSetupStatus;
  serverId: string;
}) {
  const domain = status.domain ?? "";
  return (
    <div className="space-y-5">
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Check
                className="size-5 text-emerald-600 dark:text-emerald-400"
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-semibold text-foreground">
                Mail server provisioned
                {domain && (
                  <span className="text-muted-foreground font-normal">
                    {" · "}
                    {domain}
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                The full mail stack is installed and running on this server.
                Manage mailboxes, domains, DNS, and credentials in the Mail
                admin — this tab is just a pointer.
              </p>
            </div>
          </div>
          <Link
            href={`/emails?serverId=${encodeURIComponent(serverId)}`}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors shrink-0"
          >
            Open Mail admin
            <ArrowRight className="size-3.5" strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      <HealthSnapshot serverId={serverId} />
    </div>
  );
}

// ─── Daemon health snapshot ──────────────────────────────────────────────────

/**
 * One-shot daemon-health read. NOT polled (the Mail admin's Health tab is
 * where the live polling lives). This is a static snapshot so the
 * server-detail page shows "everything's fine" or "X daemons need
 * attention" without imitating the admin's full UI.
 */
function HealthSnapshot({ serverId }: { serverId: string }) {
  const [components, setComponents] = useState<MailComponentHealth[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    mailApi
      .getHealth(serverId)
      .then((r) => {
        if (!cancelled) setComponents(r.components);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Health check failed");
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  if (error) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!components) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5 animate-pulse">
        <div className="h-10 bg-muted/40 rounded-lg" />
      </div>
    );
  }

  const downs = components.filter(
    (c) =>
      c.status === "failed" ||
      c.status === "inactive" ||
      c.status === "missing",
  );

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-3">
        {downs.length === 0 ? (
          <>
            <CheckCircle2
              className="size-5 text-emerald-500 shrink-0"
              strokeWidth={2}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                All systems operational
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {components.length} daemon
                {components.length === 1 ? "" : "s"} running. Live status in
                the Mail admin's Health tab.
              </p>
            </div>
          </>
        ) : (
          <>
            <CircleAlert
              className="size-5 text-amber-500 shrink-0"
              strokeWidth={2}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {downs.length} daemon{downs.length === 1 ? "" : "s"} need
                attention
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {downs.map((d) => d.label).join(", ")} — check the Mail admin's
                Health tab for details.
              </p>
            </div>
            <CircleDashed className="size-0 shrink-0" />
          </>
        )}
        <Link
          href={`/emails?serverId=${encodeURIComponent(serverId)}&tab=health`}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          View →
        </Link>
      </div>
    </div>
  );
}
