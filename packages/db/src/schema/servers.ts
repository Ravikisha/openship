import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";

// ─── Servers ─────────────────────────────────────────────────────────────────

/**
 * SSH server configurations for deployments.
 *
 * Multiple rows — one per configured server. Replaces the SSH fields
 * that were previously embedded in the singleton `instance_settings` row.
 */
export const servers = pgTable("servers", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),

  /** Human-readable label — defaults to sshHost when not set */
  name: text("name"),

  // ── Server capabilities ──────────────────────────────────────────────────
  //
  // Two orthogonal booleans rather than a 3-valued enum — composes cleanly
  // for any combination (apps-only, mail-only, both). The dashboard's
  // "What does this server run?" picker writes these flags directly.
  //
  //   runsApps = true  → openship deploys apps here (Docker / bare runtime).
  //                      Component installer is allowed to install Docker,
  //                      rsync, certbot, etc.
  //   runsMail = true  → mail-server provisioning pipeline can target this
  //                      host (rsync engine + run iRedMail.sh).
  //
  // Both flags can be true on the same row — a small self-hosted setup
  // where one VPS runs apps + iRedMail side by side.

  /** Whether this server hosts app deployments (Docker / bare runtime). */
  runsApps: boolean("runs_apps").notNull().default(true),
  /** Whether this server hosts the iRedMail mail server (Postfix + Dovecot + …). */
  runsMail: boolean("runs_mail").notNull().default(false),

  // ── SSH credentials ────────────────────────────────────────────────────────

  sshHost: text("ssh_host").notNull(),
  sshPort: integer("ssh_port").default(22),
  sshUser: text("ssh_user").default("root"),
  sshAuthMethod: text("ssh_auth_method"), // "password" | "key"
  sshPassword: text("ssh_password"),
  sshKeyPath: text("ssh_key_path"),
  sshKeyPassphrase: text("ssh_key_passphrase"),
  sshJumpHost: text("ssh_jump_host"),
  sshArgs: text("ssh_args"),

  // ── Timestamps ─────────────────────────────────────────────────────────────

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
