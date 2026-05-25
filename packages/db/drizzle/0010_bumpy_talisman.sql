-- Monorepo support: discriminator column on `service` to host monorepo sub-apps
-- alongside compose services, plus the per-sub-app build/runtime fields. Compose
-- rows default to kind="compose" so existing data is unaffected.
ALTER TABLE "service" ADD COLUMN "kind" text DEFAULT 'compose' NOT NULL;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "root_directory" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "install_command" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "build_command" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "start_command" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "output_directory" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "framework" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "package_manager" text;--> statement-breakpoint
ALTER TABLE "service" ADD COLUMN "build_image" text;--> statement-breakpoint

-- Shared workspace install command for monorepo projects (run once at repo root
-- before any per-app build). Null for non-monorepo projects.
ALTER TABLE "project" ADD COLUMN "workspace_install_command" text;
