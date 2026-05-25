/**
 * Monorepo deploy adapter.
 *
 * Phase 3 minimum-viable behavior — when a project has monorepo sub-app rows
 * persisted, we deploy the FIRST enabled one through the existing single-app
 * pipeline, with the shared workspace install command prepended to its install
 * step. The remaining sub-app rows stay persisted in the `service` table so
 * the next iteration can switch them on with the multi-workload fan-out.
 *
 * This is intentionally honest: the schema, UI and persistence layer all carry
 * the full multi-app shape, but a single `executeBuildAndDeploy` invocation
 * currently produces one running app. The workspace install is shared so
 * adding the fan-out later is a localized change inside this module.
 */

import { repos, type Project, type Service } from "@repo/db";
import type { BuildConfigSnapshotLike } from "../build-config";
import { listProjectMonorepoApps } from "../compose";

export interface MonorepoSnapshotOverrides {
  rootDirectory: string;
  installCommand: string;
  buildCommand: string;
  startCommand: string;
  framework: string;
  packageManager: string;
  buildImage: string;
  outputDirectory: string;
  port: number | undefined;
  hasServer: boolean;
  hasBuild: boolean;
  primaryAppName: string;
  primaryAppId: string;
  /** Other enabled apps that aren't being deployed this turn (informational). */
  pendingAppNames: string[];
}

/**
 * Resolve the deploy plan for a monorepo project. Returns null when there are
 * no enabled monorepo sub-app rows (in which case the caller falls back to the
 * normal single-app pipeline).
 */
export async function resolveMonorepoPlan(
  project: Project,
): Promise<MonorepoSnapshotOverrides | null> {
  const apps = await listProjectMonorepoApps(project.id);
  const enabled = apps.filter((app) => app.enabled);
  if (enabled.length === 0) return null;

  // Stable pick: the lowest sortOrder, breaking ties by name.
  const primary = enabled.sort(compareAppOrder)[0];
  const others = enabled.filter((app) => app.id !== primary.id).map((app) => app.name);

  const installCommand = composeInstallCommand(
    project.workspaceInstallCommand ?? null,
    primary.installCommand ?? null,
    primary.rootDirectory ?? null,
  );

  const portNumber = primary.exposedPort ? Number(primary.exposedPort) : undefined;

  return {
    rootDirectory: primary.rootDirectory ?? "./",
    installCommand,
    buildCommand: primary.buildCommand ?? "",
    startCommand: primary.startCommand ?? "",
    framework: primary.framework ?? "unknown",
    packageManager: primary.packageManager ?? "npm",
    buildImage: primary.buildImage ?? "node:22",
    outputDirectory: primary.outputDirectory ?? "",
    port: Number.isFinite(portNumber) ? portNumber : undefined,
    hasServer: Boolean(primary.startCommand),
    hasBuild: Boolean(primary.buildCommand),
    primaryAppName: primary.name,
    primaryAppId: primary.id,
    pendingAppNames: others,
  };
}

/**
 * Merge a monorepo plan onto a deployment snapshot — the same shape the
 * single-app pipeline consumes, with the primary sub-app's commands and root.
 */
export function applyMonorepoOverrides<S extends BuildConfigSnapshotLike>(
  snapshot: S,
  plan: MonorepoSnapshotOverrides,
): S {
  return {
    ...snapshot,
    framework: plan.framework,
    packageManager: plan.packageManager,
    buildImage: plan.buildImage,
    rootDirectory: plan.rootDirectory,
    installCommand: plan.installCommand,
    buildCommand: plan.buildCommand,
    startCommand: plan.startCommand,
    outputDirectory: plan.outputDirectory,
    port: plan.port ?? snapshot.port,
    hasServer: plan.hasServer,
    hasBuild: plan.hasBuild,
  };
}

function compareAppOrder(left: Service, right: Service): number {
  const lo = left.sortOrder ?? 0;
  const ro = right.sortOrder ?? 0;
  if (lo !== ro) return lo - ro;
  return left.name.localeCompare(right.name);
}

/**
 * Compose the effective install command for a monorepo primary app:
 *   1. Run shared workspace install at the repo root (if set).
 *   2. Run the per-app install command inside the sub-app's directory (if set).
 *
 * When both are present we chain them so the runtime executes both in order.
 * When only one is present, return it unchanged.
 */
function composeInstallCommand(
  workspaceInstall: string | null,
  appInstall: string | null,
  appRootDirectory: string | null,
): string {
  const workspace = workspaceInstall?.trim();
  const appCmd = appInstall?.trim();
  const root = appRootDirectory?.trim().replace(/^\.\//, "").replace(/^\/+|\/+$/g, "");

  if (workspace && appCmd && root) {
    return `${workspace} && cd ${root} && ${appCmd}`;
  }
  if (workspace && appCmd) {
    return `${workspace} && ${appCmd}`;
  }
  if (workspace) return workspace;
  return appCmd ?? "";
}

export async function persistMonorepoDeployMetadata(
  projectId: string,
  plan: MonorepoSnapshotOverrides,
): Promise<void> {
  // Cache the primary app's resolved settings on the project row so subsequent
  // single-app code paths see consistent values (active deployment lookups,
  // env-var scoping, route persistence).
  await repos.project
    .update(projectId, {
      framework: plan.framework,
      packageManager: plan.packageManager,
      buildImage: plan.buildImage,
      installCommand: plan.installCommand,
      buildCommand: plan.buildCommand,
      startCommand: plan.startCommand,
      outputDirectory: plan.outputDirectory,
      rootDirectory: plan.rootDirectory,
      port: plan.port ?? null,
      hasServer: plan.hasServer,
      hasBuild: plan.hasBuild,
    })
    .catch(() => {});
}
