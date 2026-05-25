"use client";

/**
 * Monorepo deploy form.
 *
 * Renders when the prepare endpoint detected a workspace manifest + 2 or more
 * deployable sub-apps. Top: shared workspace install settings (package
 * manager + root install command). Below: one expandable card per sub-app,
 * each wrapped in `MonorepoAppProvider` so the existing single-app form
 * components (ProjectSettings + BuildSettings + EnvironmentVariables) write
 * into that sub-app's slice without modification.
 */

import React, { useCallback, useState } from "react";
import { Boxes, ChevronDown, ChevronRight, Layers } from "lucide-react";
import { useDeployment } from "@/context/DeploymentContext";
import { MonorepoAppProvider } from "@/context/deployment/MonorepoAppProvider";
import type { MonorepoAppConfig } from "@/context/deployment/types";
import { getFrameworkConfig } from "./Frameworks";
import ProjectSettings from "./ProjectSettings";
import BuildSettings from "./BuildSettings";
import EnvironmentVariables from "./EnvironmentVariables";

const WorkspaceCard: React.FC = () => {
  const { config, updateConfig } = useDeployment();
  const workspace = config.monorepoWorkspace;
  if (!workspace) return null;

  const setWorkspace = (patch: Partial<typeof workspace>) => {
    updateConfig({ monorepoWorkspace: { ...workspace, ...patch } });
  };

  return (
    <div className="bg-card rounded-2xl border border-border/50">
      <div className="px-5 py-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-[15px] font-semibold text-foreground">Workspace</h3>
            <p className="text-xs text-muted-foreground">
              Shared install at the repo root, run once before each app builds.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Package manager</label>
            <input
              type="text"
              value={workspace.packageManager}
              onChange={(e) => setWorkspace({ packageManager: e.target.value })}
              className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Workspace install</label>
            <input
              type="text"
              value={workspace.installCommand}
              onChange={(e) => setWorkspace({ installCommand: e.target.value })}
              placeholder="pnpm install -w"
              className="w-full px-3 py-2 bg-muted/30 border border-border/50 rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const AppCard: React.FC<{ app: MonorepoAppConfig; index: number }> = ({ app, index }) => {
  const { config, updateConfig } = useDeployment();
  const apps = config.monorepoApps ?? [];
  const [expanded, setExpanded] = useState(index < 2); // first two open by default
  const frameworkConfig = getFrameworkConfig(app.framework);

  const setEnabled = useCallback(
    (enabled: boolean) => {
      const next = apps.slice();
      next[index] = { ...app, enabled };
      updateConfig({ monorepoApps: next });
    },
    [apps, app, index, updateConfig],
  );

  return (
    <div className={`bg-card rounded-2xl border ${app.enabled ? "border-border/50" : "border-border/30 opacity-70"} overflow-hidden`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center justify-center w-6 h-6 rounded-md hover:bg-muted/40 transition-colors"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <h4 className="text-[15px] font-semibold text-foreground truncate">{app.name}</h4>
            <span className="text-xs text-muted-foreground truncate">{app.rootDirectory}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
            <span>{frameworkConfig.name}</span>
            {app.port && <span>· port {app.port}</span>}
            {app.packageManager && <span>· {app.packageManager}</span>}
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={app.enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-4 h-4 rounded border-border/60 text-primary focus:ring-primary/30"
          />
          <span className="text-xs text-muted-foreground">Deploy</span>
        </label>
      </div>

      {/* Expanded body — uses the existing single-app form components, but
          scoped to this sub-app via MonorepoAppProvider. */}
      {expanded && app.enabled && (
        <div className="border-t border-border/40 bg-muted/10 px-5 py-5 space-y-5">
          <MonorepoAppProvider index={index}>
            <ProjectSettings />
            <BuildSettings />
            <EnvironmentVariables />
          </MonorepoAppProvider>
        </div>
      )}
    </div>
  );
};

const MonorepoApps: React.FC = () => {
  const { config } = useDeployment();
  const apps = config.monorepoApps ?? [];
  const selectedCount = apps.filter((a) => a.enabled).length;

  if (apps.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* Header banner */}
      <div className="bg-card rounded-2xl border border-border/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Boxes className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-foreground">
              Monorepo — {apps.length} apps detected
            </h3>
            <p className="text-xs text-muted-foreground">
              {selectedCount} of {apps.length} selected. Each app deploys to its own port and domain,
              sharing one workspace install at the repo root.
            </p>
          </div>
        </div>
      </div>

      <WorkspaceCard />

      <div className="space-y-3">
        {apps.map((app, i) => (
          <AppCard key={app.id} app={app} index={i} />
        ))}
      </div>
    </div>
  );
};

export default MonorepoApps;
