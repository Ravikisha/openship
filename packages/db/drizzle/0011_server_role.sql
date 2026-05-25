-- Initial draft of the server-capability column. Superseded by 0012 which
-- drops `role` and replaces it with the orthogonal `runs_apps` + `runs_mail`
-- boolean pair. Kept here unchanged because installs that already ran this
-- migration have the journal pointing at it; modifying it would silently
-- skip 0012 on those installs.
ALTER TABLE "servers" ADD COLUMN IF NOT EXISTS "role" text DEFAULT 'general';
