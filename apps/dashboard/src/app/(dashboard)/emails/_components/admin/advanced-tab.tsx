"use client";

/**
 * Advanced tab — destructive / power-user actions tucked away from the
 * day-1 surface.
 *
 * Pulled OUT of Overview because operators were one mis-click away from
 * "Re-run setup" while just trying to read the credentials. The actions
 * here are still reachable but visually framed as serious:
 *
 *   - Re-run setup: opens the wizard pointed at this server. The wizard
 *     itself handles "already provisioned" gracefully (it offers retry-
 *     from-step rather than a full reinstall), so the action is safe
 *     when used correctly — we just don't want it surfaced as a primary
 *     CTA.
 *   - Reset on-server state: wipes /root/.openship-mail-state.json on the
 *     VPS. Useful after a manual purge / re-image. Does NOT uninstall
 *     the mail stack — just clears openship's tracking record.
 *
 * Each action gets a danger-zone styled card with a clear description of
 * what it does and what it does NOT do.
 */

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw, Trash2, Loader2 } from "lucide-react";
import { mailApi, getApiErrorMessage, type MailSetupStatus } from "@/lib/api";
import { useModal } from "@/context/ModalContext";
import { FormModalContent } from "./_shared/form-modal-content";

interface AdvancedTabProps {
  status: MailSetupStatus;
  serverId: string;
  onChanged: () => void;
}

export function AdvancedTab({ status, serverId, onChanged }: AdvancedTabProps) {
  const { showModal, hideModal } = useModal();
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const openReset = () => {
    const id = showModal({
      maxWidth: "480px",
      showCloseButton: false,
      customContent: (
        <FormModalContent
          title="Reset on-server state?"
          description="Wipes /root/.openship-mail-state.json on the mail VPS. The mail stack itself is NOT uninstalled — Postfix, Dovecot, and the rest keep running with their current data. Only openship's tracking record is removed."
          submitLabel="Reset state"
          submittingLabel="Resetting…"
          submitVariant="danger"
          onSubmit={async () => {
            setResetError(null);
            setResetting(true);
            try {
              await mailApi.resetSetup(serverId);
              hideModal(id);
              onChanged();
            } catch (err) {
              setResetError(getApiErrorMessage(err, "Reset failed"));
              throw err;
            } finally {
              setResetting(false);
            }
          }}
          onCancel={() => hideModal(id)}
        >
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 leading-relaxed">
            After this, the /emails page will show the install wizard again
            for this server. You can then either re-run from step 1 or pick
            up from a specific step.
          </div>
        </FormModalContent>
      ),
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <AlertTriangle
            className="size-4 text-amber-600 dark:text-amber-400"
            strokeWidth={2.25}
          />
          <h2 className="text-lg font-semibold text-foreground">Danger zone</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          These actions can disrupt a working mail server or clear important
          tracking state. Read the description on each card before clicking.
        </p>
      </div>

      {/* Re-run setup */}
      <DangerCard
        icon={RotateCw}
        title="Re-run setup wizard"
        description="Opens the install wizard pointed at this server. Useful after a DNS change, a domain rename, or to retry a failed step. The wizard detects an existing install and offers per-step retry rather than wiping state."
        action={
          <Link
            href={`/emails?serverId=${encodeURIComponent(serverId)}&force=wizard`}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-muted text-foreground hover:bg-muted/80 border border-border transition-colors"
          >
            <RotateCw className="size-3.5" />
            Open wizard
          </Link>
        }
      />

      {/* Reset on-server state */}
      <DangerCard
        icon={Trash2}
        title="Reset on-server state"
        description="Removes /root/.openship-mail-state.json from the VPS. Does NOT uninstall the mail stack or remove any mailboxes — Postfix and Dovecot keep running. Use after a manual purge or re-image, when openship's tracking has drifted from reality."
        action={
          <button
            onClick={openReset}
            disabled={resetting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {resetting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Reset state
          </button>
        }
        error={resetError}
      />

      {/* Install metadata — useful here so it's discoverable but not on Overview */}
      <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
        <div className="px-5 py-4 border-b border-border/50">
          <h3 className="text-[14px] font-semibold text-foreground">
            Install metadata
          </h3>
        </div>
        <dl className="divide-y divide-border/40">
          <MetaRow label="Server ID" value={serverId} mono />
          <MetaRow label="Primary domain" value={status.domain ?? "—"} />
          {status.startedAt && (
            <MetaRow
              label="Started at"
              value={new Date(status.startedAt).toLocaleString()}
            />
          )}
          {status.finishedAt && (
            <MetaRow
              label="Finished at"
              value={new Date(status.finishedAt).toLocaleString()}
            />
          )}
        </dl>
      </div>
    </div>
  );
}

function DangerCard({
  icon: Icon,
  title,
  description,
  action,
  error,
}: {
  icon: typeof RotateCw;
  title: string;
  description: string;
  action: React.ReactNode;
  error?: string | null;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
          <Icon className="size-5 text-amber-600 dark:text-amber-400" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
            {description}
          </p>
          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
}

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3">
      <dt className="w-32 text-xs font-medium text-muted-foreground shrink-0">
        {label}
      </dt>
      <dd
        className={`text-[13px] text-foreground truncate ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}
