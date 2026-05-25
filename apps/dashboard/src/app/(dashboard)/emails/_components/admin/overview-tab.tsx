"use client";

/**
 * Overview tab — what an operator wants on day one.
 *
 * Layout matches the rest of the dashboard (DashboardHomeClient pattern):
 *
 *   Left column (1fr):
 *     1. Credentials card  — username + masked password + change-inline.
 *     2. Server settings    — IMAP/SMTP host, port, encryption.
 *     3. Setup guides       — banner card with 4 entry points that route
 *                             to /emails/setup-guides/<client>/ pages.
 *     4. Webmail            — sign-in URL + "coming soon" badge for Zero.
 *
 *   Right column (340px, sticky):
 *     1. Mail stats     — domain/mailbox/alias/storage/message counts.
 *     2. Quick actions  — links into other tabs.
 *
 * Visual baseline matches DashboardHomeClient and HomeTipCard:
 *   - Single-padded cards (`p-5`), inline icon + heading at the top,
 *     NO separate `px-5 py-4 border-b` header bar.
 *   - Icons are size-4 / size-[18px] in muted-coloured boxes — no
 *     rainbow per-card colour.
 *   - Status / accent colours reserved for status pills.
 *
 * Components/daemon health is NOT here — that's the Components tab.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  Send,
  Settings2,
  Smartphone,
  Sparkles,
  UserPlus,
  UserRound,
  HardDrive,
  Apple,
  Lock,
} from "lucide-react";
import {
  mailApi,
  mailAdminApi,
  type MailCredentials,
  type MailServerStats,
  type MailSetupStatus,
} from "@/lib/api";
import { Skeleton } from "./_shared/skeleton";

interface OverviewTabProps {
  status: MailSetupStatus;
  serverId: string;
  onRefresh: () => void;
}

export function OverviewTab({ status, serverId, onRefresh }: OverviewTabProps) {
  const domain = status.domain ?? "";
  const mailHost = domain ? `mail.${domain}` : "";
  const webmailUrl = mailHost ? `https://${mailHost}/` : "";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-5 min-w-0">
        {status.credentials && (
          <CredentialsCard
            credentials={status.credentials}
            serverId={serverId}
            onChanged={onRefresh}
          />
        )}
        {status.credentials && (
          <ServerSettingsCard credentials={status.credentials} />
        )}
        <SetupGuidesBanner serverId={serverId} />
        <WebmailCard webmailUrl={webmailUrl} mailHost={mailHost} />
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <MailStatsCard serverId={serverId} />
        <QuickActionsCard />
      </div>
    </div>
  );
}

// ─── Credentials ─────────────────────────────────────────────────────────────

function CredentialsCard({
  credentials,
  serverId,
  onChanged,
}: {
  credentials: MailCredentials;
  serverId: string;
  onChanged: () => void;
}) {
  const [revealed, setRevealed] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border/50">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <KeyRound className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">
          Postmaster credentials
        </h3>
      </div>
      <div className="border-t border-border/40 divide-y divide-border/40">
        <CredentialRow label="Username" value={credentials.username} />
        {editing ? (
          <ChangePasswordRow
            serverId={serverId}
            onCancel={() => setEditing(false)}
            onSaved={() => {
              setEditing(false);
              onChanged();
            }}
          />
        ) : (
          <CredentialRow
            label="Password"
            value={credentials.password}
            masked={!revealed}
            isFontMono
            onToggleMask={() => setRevealed((v) => !v)}
            trailingAction={
              <button
                onClick={() => setEditing(true)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
              >
                Change
              </button>
            }
          />
        )}
      </div>
    </div>
  );
}

function CredentialRow({
  label,
  value,
  masked,
  isFontMono,
  onToggleMask,
  trailingAction,
}: {
  label: string;
  value: string;
  masked?: boolean;
  isFontMono?: boolean;
  onToggleMask?: () => void;
  trailingAction?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const display = masked ? "•".repeat(Math.min(value.length, 22)) : value;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      /* HTTP fallback */
    }
  };
  return (
    <div className="flex items-center gap-4 px-5 py-3.5">
      <div className="w-24 text-xs font-medium text-muted-foreground shrink-0">
        {label}
      </div>
      <div
        className={`min-w-0 flex-1 text-[13px] text-foreground truncate ${
          isFontMono ? "font-mono" : ""
        }`}
      >
        {display}
      </div>
      {onToggleMask && (
        <button
          onClick={onToggleMask}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          title={masked ? "Reveal" : "Hide"}
        >
          {masked ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
      )}
      <button
        onClick={copy}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        title="Copy"
      >
        {copied ? (
          <Check className="size-3.5 text-emerald-500" />
        ) : (
          <Copy className="size-3.5" />
        )}
      </button>
      {trailingAction}
    </div>
  );
}

function ChangePasswordRow({
  serverId,
  onCancel,
  onSaved,
}: {
  serverId: string;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (password.length < 12) return "Password must be at least 12 characters.";
    if (password !== confirm) return "Passwords don't match.";
    return null;
  };

  const generate = () => {
    const buf = new Uint8Array(18);
    crypto.getRandomValues(buf);
    const b64 = btoa(String.fromCharCode(...buf))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    setPassword(b64);
    setConfirm(b64);
    setReveal(true);
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await mailApi.setPostmasterPassword(serverId, password);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-background text-[13px] font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-colors";

  return (
    <div className="px-5 py-4 space-y-3 bg-muted/20">
      <div className="flex items-center gap-4">
        <div className="w-24 text-xs font-medium text-muted-foreground shrink-0">
          New password
        </div>
        <input
          type={reveal ? "text" : "password"}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 12 characters"
          className={inputCls}
        />
        <button
          onClick={() => setReveal((v) => !v)}
          type="button"
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
        >
          {reveal ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 text-xs font-medium text-muted-foreground shrink-0">
          Confirm
        </div>
        <input
          type={reveal ? "text" : "password"}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Type it again"
          className={inputCls}
        />
        <div className="w-7" />
      </div>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 ml-28">{error}</p>
      )}
      <div className="flex items-center justify-between ml-28 pt-1">
        <button
          onClick={generate}
          type="button"
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Generate strong password
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            type="button"
            className="px-3 py-1.5 text-xs font-medium rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            type="button"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {saving && <Loader2 className="size-3 animate-spin" />}
            Save password
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Server settings ─────────────────────────────────────────────────────────

function ServerSettingsCard({ credentials }: { credentials: MailCredentials }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Settings2 className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">Server settings</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ServerSettingBlock
          icon={Inbox}
          label="Incoming · IMAP"
          host={credentials.imapHost}
          port={credentials.imapPort}
          encryption="SSL/TLS"
        />
        <ServerSettingBlock
          icon={Send}
          label="Outgoing · SMTP"
          host={credentials.smtpHost}
          port={credentials.smtpPort}
          encryption="STARTTLS"
        />
      </div>
      <div className="mt-4 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
        <p className="text-xs text-foreground/90 leading-relaxed">
          <Lock className="inline-block size-3 mr-1 -mt-0.5 text-muted-foreground" />
          Username on both servers is your <strong>full email address</strong>
          {" "}— e.g.{" "}
          <code className="font-mono text-[11.5px] px-1 py-0.5 rounded bg-card border border-border/40">
            {credentials.username}
          </code>
          . Password is the one in the card above.
        </p>
      </div>
    </div>
  );
}

function ServerSettingBlock({
  icon: Icon,
  label,
  host,
  port,
  encryption,
}: {
  icon: typeof Inbox;
  label: string;
  host: string;
  port: number;
  encryption: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-2 mb-2.5">
        <Icon className="size-3.5 text-muted-foreground" strokeWidth={2} />
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
      </div>
      <dl className="space-y-1.5 text-[13px]">
        <div className="flex items-center gap-3">
          <dt className="w-16 text-xs text-muted-foreground">Host</dt>
          <dd className="font-mono text-foreground truncate">{host}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="w-16 text-xs text-muted-foreground">Port</dt>
          <dd className="font-mono text-foreground">{port}</dd>
        </div>
        <div className="flex items-center gap-3">
          <dt className="w-16 text-xs text-muted-foreground">Security</dt>
          <dd className="font-mono text-foreground">{encryption}</dd>
        </div>
      </dl>
    </div>
  );
}

// ─── Setup guides banner ─────────────────────────────────────────────────────

function SetupGuidesBanner({ serverId }: { serverId: string }) {
  const baseHref = `/emails/setup-guides`;
  const qs = `?serverId=${encodeURIComponent(serverId)}`;

  return (
    <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-2xl border border-primary/15 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="size-4 text-primary" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">Setup guides</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        Step-by-step walkthroughs for every common way to use this mailbox —
        from your phone to your codebase.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <GuideCard
          href={`${baseHref}/ios${qs}`}
          icon={Apple}
          title="iOS & macOS Mail"
          subtitle="Add as IMAP on iPhone / iPad / Mac"
        />
        <GuideCard
          href={`${baseHref}/android${qs}`}
          icon={Smartphone}
          title="Android Gmail app"
          subtitle="Add as a third-party IMAP account"
        />
        <GuideCard
          href={`${baseHref}/desktop${qs}`}
          icon={Mail}
          title="Desktop clients"
          subtitle="Thunderbird, Outlook, Spark, K-9"
        />
        <GuideCard
          href={`${baseHref}/nodemailer${qs}`}
          icon={Code2}
          title="Send via code"
          subtitle="Node.js, Python, anywhere SMTP works"
        />
      </div>
    </div>
  );
}

function GuideCard({
  href,
  icon: Icon,
  title,
  subtitle,
}: {
  href: string;
  icon: typeof Mail;
  title: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border/50 hover:bg-muted/40 hover:border-border transition-all group"
    >
      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
        <Icon className="size-[18px] text-muted-foreground" strokeWidth={2} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>
      </div>
      <ChevronRight className="size-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors shrink-0" />
    </Link>
  );
}

// ─── Webmail ─────────────────────────────────────────────────────────────────

function WebmailCard({
  webmailUrl,
  mailHost,
}: {
  webmailUrl: string;
  mailHost: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-1">
        <Inbox className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">Webmail</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">
        A browser inbox will deploy at{" "}
        <code className="font-mono text-[12px] px-1.5 py-0.5 rounded bg-muted/60 text-foreground">
          {mailHost || "mail.<your-domain>"}
        </code>{" "}
        in a future release. Until then, use any mail client with the
        credentials above.
      </p>
      <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground mb-0.5">
            Sign-in URL
          </p>
          <p className="text-sm font-mono text-foreground truncate">
            {webmailUrl || "—"}
          </p>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-medium shrink-0">
          Coming soon
        </span>
      </div>
    </div>
  );
}

// ─── Right sidebar ───────────────────────────────────────────────────────────

function MailStatsCard({ serverId }: { serverId: string }) {
  const [stats, setStats] = useState<MailServerStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    mailAdminApi.stats
      .get(serverId)
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Stats failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">Mail stats</h3>
      </div>

      {loading ? (
        <StatsSkeleton />
      ) : error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : stats ? (
        <div className="space-y-3">
          <StatRow
            icon={Globe}
            iconBg="bg-primary/10"
            iconColor="text-primary"
            label="Domains"
            value={stats.domains.active}
            sub={stats.domains.total !== stats.domains.active ? `${stats.domains.total} total` : undefined}
          />
          <StatRow
            icon={UserRound}
            iconBg="bg-orange-500/10"
            iconColor="text-orange-500"
            label="Mailboxes"
            value={stats.mailboxes.active}
            sub={stats.mailboxes.total !== stats.mailboxes.active ? `${stats.mailboxes.total} total` : undefined}
          />
          <StatRow
            icon={ArrowRight}
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            label="Aliases"
            value={stats.aliases.total}
          />

          <div className="h-px bg-border/60 my-2" />

          <StatRow
            icon={HardDrive}
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            label="Storage"
            value={formatBytes(stats.storageBytes)}
          />
          <StatRow
            icon={Inbox}
            iconBg="bg-muted"
            iconColor="text-muted-foreground"
            label="Messages"
            value={stats.messages.toLocaleString()}
          />
        </div>
      ) : null}
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-4 w-10" />
        </div>
      ))}
    </div>
  );
}

function StatRow({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
}: {
  icon: typeof Globe;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  sub?: string;
}) {
  const stringValue =
    typeof value === "number" ? value.toLocaleString() : value;
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-lg ${iconBg} flex items-center justify-center`}
        >
          <Icon className={`size-4 ${iconColor}`} strokeWidth={2} />
        </div>
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-foreground tabular-nums leading-none">
          {stringValue}
        </p>
        {sub && (
          <p className="text-[10.5px] text-muted-foreground/70 mt-0.5 leading-none">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickActionsCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">Quick actions</h3>
      </div>
      <div className="space-y-2">
        <QuickActionLink
          href="?tab=mailboxes"
          icon={UserPlus}
          label="Add a mailbox"
        />
        <QuickActionLink
          href="?tab=domains"
          icon={Globe}
          label="Add a domain"
        />
        <QuickActionLink
          href="?tab=dns"
          icon={Mail}
          label="Review DNS records"
        />
      </div>
    </div>
  );
}

function QuickActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof UserPlus;
  label: string;
}) {
  return (
    <Link
      href={href}
      replace
      scroll={false}
      className="flex items-center gap-2.5 -mx-2 px-2.5 py-2 rounded-lg hover:bg-muted/40 transition-colors group"
    >
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="size-4 text-muted-foreground" strokeWidth={2} />
      </div>
      <span className="text-sm text-foreground flex-1">{label}</span>
      <ArrowRight className="size-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
    </Link>
  );
}

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const KB = 1024;
  const MB = KB * 1024;
  const GB = MB * 1024;
  if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(1)} MB`;
  return `${(bytes / KB).toFixed(0)} KB`;
}
