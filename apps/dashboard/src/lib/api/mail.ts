import { api, getApiBaseUrl } from "./client";
import { endpoints } from "./endpoints";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface MailSetupStep {
  id: number;
  key: string;
  label: string;
  description: string;
}

export interface MailStepStatus extends MailSetupStep {
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  message?: string;
  warning?: string;
  data?: Record<string, unknown>;
}

export interface MailSessionLogLine {
  stepId: number;
  level: "info" | "warn" | "error";
  message: string;
  ts: number;
}

// ─── Health-check types ──────────────────────────────────────────────────────

export type MailComponentStatus =
  | "active"
  | "inactive"
  | "failed"
  | "activating"
  | "deactivating"
  | "missing"
  | "unknown";

export interface MailComponentHealth {
  key: string;
  label: string;
  description: string;
  unit: string;
  status: MailComponentStatus;
  subState?: string;
  activeSince?: string;
}

export interface MailComponentDef {
  key: string;
  label: string;
  description: string;
  unit: string;
}

export interface MailHealthResponse {
  serverId: string;
  components: MailComponentHealth[];
  definitions: MailComponentDef[];
}

/**
 * Postmaster login + IMAP/SMTP host info. Surfaced to the dashboard so the
 * user has a single place to grab the credentials they need to log into
 * the mailbox (or wire Zero). Internal DB passwords stay server-side.
 */
export interface MailCredentials {
  username: string;
  password: string;
  smtpHost: string;
  smtpPort: number;
  imapHost: string;
  imapPort: number;
}

export interface MailSetupStatus {
  active: boolean;
  serverId?: string;
  domain?: string;
  currentStep?: number;
  startedAt?: number;
  finishedAt?: number;
  dnsRecords?: Record<string, unknown>;
  /**
   * Whether the operator has clicked "I've set the records — continue" on
   * a prior visit. False while the install is paused at the DKIM hold;
   * flips true once they ack so subsequent retries don't pause again.
   */
  dnsAcknowledged?: boolean;
  /**
   * Whether the operator has acknowledged the PTR (reverse DNS) gate that
   * follows DNS ack. PTRs are at the VPS provider, not the DNS provider —
   * separate gate to avoid mixing the two.
   */
  ptrAcknowledged?: boolean;
  credentials?: MailCredentials;
  steps: MailStepStatus[];
  /** Server-buffered log lines, rehydrated on page reload. */
  logs?: MailSessionLogLine[];
  /** Step the user should resume from after a failure / port conflict. */
  resumeStep?: number;
  /** Last failure message — populated when a step failed or conflict halted. */
  errorMessage?: string;
}

export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  /** MX priority. Other record types ignore this. */
  priority?: number;
  /** False = client-autoconfig helper, not required for mail delivery. */
  required?: boolean;
}

export interface DnsRecords {
  // Host records — pre-install requirement (A) + optional IPv6 (AAAA).
  // Surfaced as cards for completeness even though A is already in place
  // by the time the user sees them.
  a?: DnsRecord;
  aaaa?: DnsRecord;
  // Required for mail delivery
  mx: DnsRecord;
  spf: DnsRecord;
  dkim: DnsRecord;
  dmarc: DnsRecord;
  // Client autoconfig — forward-looking. Depend on server-side XML
  // responders (Phase 7); harmless to publish now, useful when they ship.
  autodiscoverCname?: DnsRecord;
  autoconfigCname?: DnsRecord;
}

// ─── Port conflict types ─────────────────────────────────────────────────────

export interface PortUsage {
  port: number;
  pid: number;
  process: string;
  command: string;
  isDocker: boolean;
  containerName?: string;
}

export interface PortResolution {
  id: string;
  label: string;
  description: string;
  destructive: boolean;
}

export interface PortConflict {
  port: number;
  usage: PortUsage;
  type: "traefik" | "known" | "unknown";
  serviceName?: string;
  resolutions: PortResolution[];
}

// ─── SSE event types ─────────────────────────────────────────────────────────

export interface MailSSEStepStart {
  event: "step_start";
  stepId: number;
  key: string;
  label: string;
}

export interface MailSSELog {
  event: "log";
  stepId: number;
  level: "info" | "warn" | "error";
  message: string;
}

export interface MailSSEStepDone {
  event: "step_done";
  stepId: number;
  success: boolean;
  message: string;
  warning?: string;
  data?: Record<string, unknown>;
}

export interface MailSSEDnsRecords {
  event: "dns_records";
  records: DnsRecords;
}

export interface MailSSEComplete {
  event: "complete";
  success: boolean;
  domain: string;
  mailDomain: string;
  finishedAt: number;
  webmailUrl: string;
  adminUrl: string;
}

export interface MailSSEError {
  event: "error";
  message: string;
  resumeStep?: number;
}

export interface MailSSEPortConflict {
  event: "port_conflict";
  portConflicts: PortConflict[];
}

/**
 * DKIM hold-and-continue gate. Emitted after step 11 (DKIM keys) when the
 * user hasn't yet acknowledged DNS records. The install pauses until the
 * user calls `mailApi.acknowledgeDns(...)` and then re-POSTs to /mail/setup
 * with `startStep = resumeStep`.
 */
export interface MailSSEDnsPending {
  event: "dns_pending";
  records: DnsRecords;
  resumeStep: number;
}

/**
 * PTR (reverse-DNS) hold gate. Emitted AFTER `dns_pending` is resolved.
 * PTRs are configured at the VPS provider's panel — separate from the
 * DNS provider — so this gate gets its own banner to avoid mixing them.
 */
export interface MailSSEPtrPending {
  event: "ptr_pending";
  ipv4: string;
  ipv6: string | null;
  target: string;
  resumeStep: number;
}

export type MailSSEEvent =
  | MailSSEStepStart
  | MailSSELog
  | MailSSEStepDone
  | MailSSEDnsRecords
  | MailSSEDnsPending
  | MailSSEPtrPending
  | MailSSEComplete
  | MailSSEError
  | MailSSEPortConflict;

// ─── API client ──────────────────────────────────────────────────────────────

export const mailApi = {
  /** Get list of all setup steps */
  getSteps: () =>
    api.get<{ steps: MailSetupStep[]; total: number }>(endpoints.mail.steps),

  /**
   * Get current setup status for a server. State lives ON the target
   * VPS now (not in openship's DB), so a serverId is required to know
   * whose state we're reading. Returns the "no install" shape if the
   * server can't be reached or the state file doesn't exist.
   */
  getStatus: (serverId?: string) =>
    api.get<MailSetupStatus>(
      serverId
        ? `${endpoints.mail.status}?serverId=${encodeURIComponent(serverId)}`
        : endpoints.mail.status,
    ),

  /**
   * Start or resume the mail setup wizard.
   * Returns an EventSource for SSE streaming.
   */
  startSetup: (
    serverId: string,
    domain: string,
    startStep?: number,
    config?: { adminPassword: string; storageBackend?: "mariadb" | "postgresql" },
  ): EventSource => {
    const url = new URL(endpoints.mail.setup, getApiBaseUrl());

    // We POST to start the setup, which returns SSE
    // We use fetch + ReadableStream approach for POST-based SSE
    const body = JSON.stringify({
      serverId,
      domain,
      ...(startStep ? { startStep } : {}),
      ...(config ? { config } : {}),
    });

    // Store body for the streaming function
    const es = new EventSource(url.toString());
    // EventSource only supports GET — we need a custom approach
    // See streamSetup below for the POST+SSE pattern
    es.close();

    // Not usable directly — use streamSetup instead
    return es;
  },

  /**
   * Stream setup progress via POST + SSE using fetch ReadableStream.
   */
  streamSetup: async (
    serverId: string,
    domain: string,
    startStep: number | undefined,
    config: { adminPassword: string; storageBackend?: "mariadb" | "postgresql" } | undefined,
    onEvent: (event: MailSSEEvent) => void,
    onDone?: () => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const url = new URL(endpoints.mail.setup, getApiBaseUrl());
    const res = await fetch(url.toString(), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serverId,
        domain,
        ...(startStep ? { startStep } : {}),
        ...(config ? { config } : {}),
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Setup failed: ${res.status}`);
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE frames
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      let eventType = "";
      let eventData = "";

      for (const line of lines) {
        if (line.startsWith("event:")) {
          eventType = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          eventData = line.slice(5).trim();
        } else if (line === "" && eventType && eventData) {
          try {
            const parsed = JSON.parse(eventData);
            onEvent({ event: eventType, ...parsed } as MailSSEEvent);
          } catch {
            // Skip malformed events
          }
          eventType = "";
          eventData = "";
        }
      }
    }

    onDone?.();
  },

  /** Cancel a running setup */
  cancelSetup: () =>
    api.post<{ ok: boolean; message: string }>(endpoints.mail.cancelSetup),

  /**
   * Wipe the on-server state file. Use after purging or reimaging the VPS
   * so the dashboard stops showing stale "step 9 complete" data.
   */
  resetSetup: (serverId: string) =>
    api.post<{ ok: boolean }>(endpoints.mail.resetSetup, { serverId }),

  /**
   * Mark DNS records as configured for a (server, domain) session — releases
   * the install past the DKIM hold step. The caller should follow this with
   * a `streamSetup(..., startStep = resumeStep)` to actually resume.
   */
  acknowledgeDns: (serverId: string, domain: string) =>
    api.post<{ ok: boolean }>(endpoints.mail.acknowledgeDns, {
      serverId,
      domain,
    }),

  /**
   * Mark PTR (reverse DNS) as configured — releases the install past the
   * VPS-provider gate that runs after DNS ack. Same call shape as DNS ack.
   */
  acknowledgePtr: (serverId: string) =>
    api.post<{ ok: boolean }>(endpoints.mail.acknowledgePtr, {
      serverId,
    }),

  /**
   * Rotate the postmaster password. Hashes via doveadm on the server and
   * UPDATEs `vmail.mailbox` directly. Refuses if a setup is currently
   * running against this server.
   */
  setPostmasterPassword: (serverId: string, password: string) =>
    api.post<{ ok: boolean }>(endpoints.mail.setPostmasterPassword, {
      serverId,
      password,
    }),

  /**
   * Live health of every mail-core daemon on the target server. The Mail
   * tab polls this every ~10 s to render running/stopped pills.
   */
  getHealth: (serverId: string) =>
    api.get<MailHealthResponse>(endpoints.mail.health(serverId)),

  /** Standalone port 80/443 scan */
  checkPorts: (serverId: string) =>
    api.post<{ conflicts: PortConflict[]; free: boolean }>(endpoints.mail.portsCheck, {
      serverId,
    }),

  /** Resolve a specific port conflict */
  resolvePorts: (serverId: string, conflict: PortConflict, resolutionId: string) =>
    api.post<{ success: boolean; message: string }>(endpoints.mail.portsResolve, {
      serverId,
      conflict,
      resolutionId,
    }),

  /**
   * Branding — proxied to the Zero webmail server. Reads come back as
   * `{ branding }` so the response shape matches PATCH; the consumer
   * always sees `.branding`.
   */
  getBranding: (serverId: string) =>
    api.get<{ branding: Branding }>(endpoints.mail.branding(serverId)),

  updateBranding: (serverId: string, patch: Partial<Branding>) =>
    api.patch<{ branding: Branding }>(endpoints.mail.branding(serverId), patch),
};

// ─── Branding ────────────────────────────────────────────────────────────────

export interface Branding {
  siteTitle: string;
  siteDescription: string;
  loginHeading: string;
  loginSubtext: string;
  loginFooter: string;
  homeHtml: string | null;
}
