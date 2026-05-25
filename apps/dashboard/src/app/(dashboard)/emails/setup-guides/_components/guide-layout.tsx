"use client";

/**
 * Shared layout for every /emails/setup-guides/<client>/ page.
 *
 * Each guide page provides:
 *   - hero header (title, subtitle, platform icon)
 *   - the actual instructions (children)
 *   - optional troubleshooting / FAQ content
 *
 * The layout auto-fetches the active mail server's credentials when a
 * `serverId` query param is present (the Overview's GuideCard always
 * passes it), and renders a "Your server settings" reference box near
 * the top so the user can copy the actual values into their client
 * without flipping tabs. When no serverId is present (operator landed
 * here from a bookmark / docs link) we hide the box rather than show
 * empty fields.
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Inbox,
  Loader2,
  Send,
} from "lucide-react";
import { mailApi, type MailCredentials } from "@/lib/api";
import { PageContainer } from "@/components/ui/PageContainer";

interface GuideLayoutProps {
  /** Hero icon component. */
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Hero title — "iOS & macOS Mail" etc. */
  title: string;
  /** Hero one-liner. */
  subtitle: string;
  /** The actual step-by-step body. */
  children: React.ReactNode;
}

export function GuideLayout({ icon: Icon, title, subtitle, children }: GuideLayoutProps) {
  const search = useSearchParams();
  const serverId = search.get("serverId");
  const [creds, setCreds] = useState<MailCredentials | null>(null);
  const [loadingCreds, setLoadingCreds] = useState(!!serverId);

  useEffect(() => {
    if (!serverId) return;
    let cancelled = false;
    setLoadingCreds(true);
    mailApi
      .getStatus(serverId)
      .then((s) => {
        if (cancelled) return;
        setCreds(s.credentials ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setCreds(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingCreds(false);
      });
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  return (
    <PageContainer outerClassName="pb-20">
      <Link
        href="/emails"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Back to Mail admin
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
        <div className="min-w-0 space-y-6">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary/5 via-primary/3 to-transparent rounded-2xl border border-primary/15 p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-card border border-border/50 flex items-center justify-center shrink-0">
                <Icon className="size-7 text-foreground" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1">
                <h1
                  className="text-2xl font-medium text-foreground"
                  style={{ letterSpacing: "-0.2px" }}
                >
                  {title}
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {subtitle}
                </p>
              </div>
            </div>
          </div>

          {children}
        </div>

        {/* Right rail — server settings sticky reference */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <ServerReferenceCard creds={creds} loading={loadingCreds} />
          <ContextLinksCard />
        </div>
      </div>
    </PageContainer>
  );
}

// ─── Server reference card ───────────────────────────────────────────────────

function ServerReferenceCard({
  creds,
  loading,
}: {
  creds: MailCredentials | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }
  if (!creds) {
    return (
      <div className="bg-card rounded-2xl border border-border/50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Inbox className="size-4 text-muted-foreground" strokeWidth={2} />
          <h3 className="font-semibold text-foreground text-sm">
            Your server settings
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Open this guide from the{" "}
          <Link href="/emails" className="text-primary hover:underline">
            Mail admin
          </Link>{" "}
          to see your specific host, port, and username pre-filled here.
        </p>
      </div>
    );
  }
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Inbox className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">
          Your server settings
        </h3>
      </div>
      <div className="space-y-3">
        <RefRow label="Username" value={creds.username} mono />
        <div className="h-px bg-border/60" />
        <RefRow label="IMAP host" value={creds.imapHost} mono />
        <RefRow label="IMAP port" value={String(creds.imapPort)} mono />
        <RefRow label="IMAP security" value="SSL/TLS" />
        <div className="h-px bg-border/60" />
        <RefRow label="SMTP host" value={creds.smtpHost} mono />
        <RefRow label="SMTP port" value={String(creds.smtpPort)} mono />
        <RefRow label="SMTP security" value="STARTTLS" />
      </div>
    </div>
  );
}

function RefRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  const [copied, setCopied] = useState(false);
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
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p
          className={`text-[13px] text-foreground truncate ${mono ? "font-mono" : ""}`}
        >
          {value}
        </p>
      </div>
      <button
        onClick={copy}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
        title="Copy"
        aria-label={`Copy ${label}`}
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

function ContextLinksCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <Send className="size-4 text-muted-foreground" strokeWidth={2} />
        <h3 className="font-semibold text-foreground text-sm">Other guides</h3>
      </div>
      <div className="space-y-1.5 text-sm">
        <Link
          href="/emails/setup-guides/ios"
          className="block text-muted-foreground hover:text-foreground transition-colors"
        >
          iOS & macOS Mail
        </Link>
        <Link
          href="/emails/setup-guides/android"
          className="block text-muted-foreground hover:text-foreground transition-colors"
        >
          Android Gmail app
        </Link>
        <Link
          href="/emails/setup-guides/desktop"
          className="block text-muted-foreground hover:text-foreground transition-colors"
        >
          Desktop clients
        </Link>
        <Link
          href="/emails/setup-guides/nodemailer"
          className="block text-muted-foreground hover:text-foreground transition-colors"
        >
          Send via code
        </Link>
      </div>
    </div>
  );
}

// ─── Shared content building blocks ──────────────────────────────────────────

/** Section heading inside a guide page. */
export function GuideSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** Numbered step list. */
export function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-muted text-foreground text-xs font-semibold flex items-center justify-center tabular-nums">
            {i + 1}
          </span>
          <div className="text-sm text-foreground/90 leading-relaxed pt-0.5">
            {item}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Callout box (info / warning / success tones). */
export function Callout({
  tone = "info",
  children,
}: {
  tone?: "info" | "warning" | "success";
  children: React.ReactNode;
}) {
  const toneClasses = {
    info: "border-border/60 bg-muted/30",
    warning: "border-amber-500/30 bg-amber-500/5",
    success: "border-emerald-500/30 bg-emerald-500/5",
  };
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm text-foreground/90 leading-relaxed ${toneClasses[tone]}`}
    >
      {children}
    </div>
  );
}
