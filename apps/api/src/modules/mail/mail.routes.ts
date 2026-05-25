/**
 * Mail setup routes — mounted at /api/mail in app.ts.
 *
 * Self-hosted only (dynamic import, gated by localOnly middleware).
 */

import { Hono } from "hono";
import { authMiddleware, localOnly } from "../../middleware";
import * as mail from "./mail.controller";
import * as admin from "./admin/admin.controller";
import * as branding from "./branding.controller";

export const mailRoutes = new Hono();

mailRoutes.use("*", localOnly);
mailRoutes.use("*", authMiddleware);

/* ── Setup wizard ─────────────────────────────────────────────────── */
mailRoutes.get("/steps", mail.getSteps);
mailRoutes.get("/status", mail.getStatus);
mailRoutes.post("/setup", mail.startSetup);
mailRoutes.post("/setup/cancel", mail.cancelSetup);
mailRoutes.post("/setup/dns-ack", mail.acknowledgeDns);
mailRoutes.post("/setup/ptr-ack", mail.acknowledgePtr);
mailRoutes.post("/setup/reset", mail.resetSetup);

/* ── Post-install operations ──────────────────────────────────────── */
mailRoutes.get("/health/:serverId", mail.getHealth);
mailRoutes.post("/credentials/postmaster", mail.setPostmasterPassword);

/* ── Admin panel — domains ────────────────────────────────────────── */
mailRoutes.get("/admin/:serverId/domains", admin.listDomainsHandler);
mailRoutes.post("/admin/:serverId/domains", admin.createDomainHandler);
mailRoutes.get("/admin/:serverId/domains/:domain", admin.getDomainHandler);
mailRoutes.patch("/admin/:serverId/domains/:domain", admin.updateDomainHandler);
mailRoutes.delete("/admin/:serverId/domains/:domain", admin.deleteDomainHandler);
mailRoutes.get(
  "/admin/:serverId/domains/:domain/dependents",
  admin.domainDependentsHandler,
);

/* ── Admin panel — mailboxes ──────────────────────────────────────── */
mailRoutes.get("/admin/:serverId/mailboxes", admin.listMailboxesHandler);
mailRoutes.post("/admin/:serverId/mailboxes", admin.createMailboxHandler);
mailRoutes.get("/admin/:serverId/mailboxes/:email", admin.getMailboxHandler);
mailRoutes.patch("/admin/:serverId/mailboxes/:email", admin.updateMailboxHandler);
mailRoutes.delete("/admin/:serverId/mailboxes/:email", admin.deleteMailboxHandler);

/* ── Admin panel — aggregates ─────────────────────────────────────── */
mailRoutes.get("/admin/:serverId/stats", admin.getStatsHandler);

/* ── Admin panel — DNS scan ───────────────────────────────────────── */
mailRoutes.get("/admin/:serverId/dns-scan", admin.getDnsScanHandler);

/* ── Branding (white-label) — proxied to Zero webmail server ──────── */
mailRoutes.get("/branding/:serverId", branding.getBrandingHandler);
mailRoutes.patch("/branding/:serverId", branding.updateBrandingHandler);
