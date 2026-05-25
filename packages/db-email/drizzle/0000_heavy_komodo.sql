CREATE SCHEMA "vmail";
--> statement-breakpoint
CREATE SCHEMA "mail_app";
--> statement-breakpoint
CREATE TABLE "vmail"."admin" (
	"username" varchar(255) DEFAULT '' NOT NULL,
	"password" varchar(255) DEFAULT '' NOT NULL,
	"name" varchar(255) DEFAULT '' NOT NULL,
	"language" varchar(5) DEFAULT '' NOT NULL,
	"passwordlastchange" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"settings" text DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "admin_username_pk" PRIMARY KEY("username")
);
--> statement-breakpoint
CREATE TABLE "vmail"."alias" (
	"address" varchar(255) DEFAULT '' NOT NULL,
	"name" varchar(255) DEFAULT '' NOT NULL,
	"accesspolicy" varchar(30) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "alias_address_pk" PRIMARY KEY("address")
);
--> statement-breakpoint
CREATE TABLE "vmail"."alias_domain" (
	"alias_domain" varchar(255) NOT NULL,
	"target_domain" varchar(255) NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "alias_domain_alias_domain_pk" PRIMARY KEY("alias_domain")
);
--> statement-breakpoint
CREATE TABLE "vmail"."anyone_shares" (
	"from_user" varchar(255) NOT NULL,
	"dummy" char(1),
	CONSTRAINT "anyone_shares_from_user_pk" PRIMARY KEY("from_user")
);
--> statement-breakpoint
CREATE TABLE "vmail"."deleted_mailboxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"username" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"maildir" varchar(255) DEFAULT '' NOT NULL,
	"bytes" bigint DEFAULT 0 NOT NULL,
	"messages" bigint DEFAULT 0 NOT NULL,
	"admin" varchar(255) DEFAULT '' NOT NULL,
	"delete_date" date
);
--> statement-breakpoint
CREATE TABLE "vmail"."domain" (
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"disclaimer" text DEFAULT '' NOT NULL,
	"aliases" bigint DEFAULT 0 NOT NULL,
	"mailboxes" bigint DEFAULT 0 NOT NULL,
	"maillists" bigint DEFAULT 0 NOT NULL,
	"maxquota" bigint DEFAULT 0 NOT NULL,
	"quota" bigint DEFAULT 0 NOT NULL,
	"transport" varchar(255) DEFAULT 'dovecot' NOT NULL,
	"settings" text DEFAULT '' NOT NULL,
	"backupmx" smallint DEFAULT 0 NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "domain_domain_pk" PRIMARY KEY("domain")
);
--> statement-breakpoint
CREATE TABLE "vmail"."domain_admins" (
	"username" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "domain_admins_username_domain_pk" PRIMARY KEY("username","domain")
);
--> statement-breakpoint
CREATE TABLE "vmail"."forwardings" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(255) DEFAULT '' NOT NULL,
	"forwarding" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"dest_domain" varchar(255) DEFAULT '' NOT NULL,
	"is_maillist" smallint DEFAULT 0 NOT NULL,
	"is_list" smallint DEFAULT 0 NOT NULL,
	"is_forwarding" smallint DEFAULT 0 NOT NULL,
	"is_alias" smallint DEFAULT 0 NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vmail"."last_login" (
	"username" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"imap" bigint,
	"pop3" bigint,
	"lda" bigint,
	CONSTRAINT "last_login_username_domain_pk" PRIMARY KEY("username","domain")
);
--> statement-breakpoint
CREATE TABLE "vmail"."mailbox" (
	"username" varchar(255) NOT NULL,
	"password" varchar(255) DEFAULT '' NOT NULL,
	"name" varchar(255) DEFAULT '' NOT NULL,
	"language" varchar(5) DEFAULT '' NOT NULL,
	"first_name" varchar(255) DEFAULT '' NOT NULL,
	"last_name" varchar(255) DEFAULT '' NOT NULL,
	"mobile" varchar(255) DEFAULT '' NOT NULL,
	"telephone" varchar(255) DEFAULT '' NOT NULL,
	"recovery_email" varchar(255) DEFAULT '' NOT NULL,
	"birthday" date DEFAULT '0001-01-01' NOT NULL,
	"mailboxformat" varchar(50) DEFAULT 'maildir' NOT NULL,
	"mailboxfolder" varchar(50) DEFAULT 'Maildir' NOT NULL,
	"storagebasedirectory" varchar(255) DEFAULT '' NOT NULL,
	"storagenode" varchar(255) DEFAULT '' NOT NULL,
	"maildir" varchar(255) DEFAULT '' NOT NULL,
	"quota" bigint DEFAULT 0 NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"transport" varchar(255) DEFAULT '' NOT NULL,
	"department" varchar(255) DEFAULT '' NOT NULL,
	"rank" varchar(255) DEFAULT 'normal' NOT NULL,
	"employeeid" varchar(255) DEFAULT '' NOT NULL,
	"isadmin" smallint DEFAULT 0 NOT NULL,
	"isglobaladmin" smallint DEFAULT 0 NOT NULL,
	"enablesmtp" smallint DEFAULT 1 NOT NULL,
	"enablesmtpsecured" smallint DEFAULT 1 NOT NULL,
	"enablepop3" smallint DEFAULT 1 NOT NULL,
	"enablepop3secured" smallint DEFAULT 1 NOT NULL,
	"enablepop3tls" smallint DEFAULT 1 NOT NULL,
	"enableimap" smallint DEFAULT 1 NOT NULL,
	"enableimapsecured" smallint DEFAULT 1 NOT NULL,
	"enableimaptls" smallint DEFAULT 1 NOT NULL,
	"enabledeliver" smallint DEFAULT 1 NOT NULL,
	"enablelda" smallint DEFAULT 1 NOT NULL,
	"enablemanagesieve" smallint DEFAULT 1 NOT NULL,
	"enablemanagesievesecured" smallint DEFAULT 1 NOT NULL,
	"enablesieve" smallint DEFAULT 1 NOT NULL,
	"enablesievesecured" smallint DEFAULT 1 NOT NULL,
	"enablesievetls" smallint DEFAULT 1 NOT NULL,
	"enableinternal" smallint DEFAULT 1 NOT NULL,
	"enabledoveadm" smallint DEFAULT 1 NOT NULL,
	"enablelib-storage" smallint DEFAULT 1 NOT NULL,
	"enablequota-status" smallint DEFAULT 1 NOT NULL,
	"enableindexer-worker" smallint DEFAULT 1 NOT NULL,
	"enablelmtp" smallint DEFAULT 1 NOT NULL,
	"enabledsync" smallint DEFAULT 1 NOT NULL,
	"enablesogo" smallint DEFAULT 1 NOT NULL,
	"enablesogowebmail" varchar(1) DEFAULT 'y' NOT NULL,
	"enablesogocalendar" varchar(1) DEFAULT 'y' NOT NULL,
	"enablesogoactivesync" varchar(1) DEFAULT 'y' NOT NULL,
	"allow_nets" text,
	"disclaimer" text DEFAULT '' NOT NULL,
	"settings" text DEFAULT '' NOT NULL,
	"passwordlastchange" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "mailbox_username_pk" PRIMARY KEY("username")
);
--> statement-breakpoint
CREATE TABLE "vmail"."maillist_owners" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(255) DEFAULT '' NOT NULL,
	"owner" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"dest_domain" varchar(255) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vmail"."maillists" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"transport" varchar(255) DEFAULT '' NOT NULL,
	"accesspolicy" varchar(30) DEFAULT '' NOT NULL,
	"maxmsgsize" bigint DEFAULT 0 NOT NULL,
	"name" varchar(255) DEFAULT '' NOT NULL,
	"description" text,
	"mlid" varchar(36) DEFAULT '' NOT NULL,
	"is_newsletter" smallint DEFAULT 0 NOT NULL,
	"settings" text,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vmail"."moderators" (
	"id" serial PRIMARY KEY NOT NULL,
	"address" varchar(255) DEFAULT '' NOT NULL,
	"moderator" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"dest_domain" varchar(255) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vmail"."recipient_bcc_domain" (
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"bcc_address" varchar(255) DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "recipient_bcc_domain_domain_pk" PRIMARY KEY("domain")
);
--> statement-breakpoint
CREATE TABLE "vmail"."recipient_bcc_user" (
	"username" varchar(255) DEFAULT '' NOT NULL,
	"bcc_address" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "recipient_bcc_user_username_pk" PRIMARY KEY("username")
);
--> statement-breakpoint
CREATE TABLE "vmail"."sender_bcc_domain" (
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"bcc_address" varchar(255) DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "sender_bcc_domain_domain_pk" PRIMARY KEY("domain")
);
--> statement-breakpoint
CREATE TABLE "vmail"."sender_bcc_user" (
	"username" varchar(255) DEFAULT '' NOT NULL,
	"bcc_address" varchar(255) DEFAULT '' NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	"created" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"modified" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"expired" timestamp DEFAULT '9999-12-31 01:01:01' NOT NULL,
	"active" smallint DEFAULT 1 NOT NULL,
	CONSTRAINT "sender_bcc_user_username_pk" PRIMARY KEY("username")
);
--> statement-breakpoint
CREATE TABLE "vmail"."sender_relayhost" (
	"id" serial PRIMARY KEY NOT NULL,
	"account" varchar(255) DEFAULT '' NOT NULL,
	"relayhost" varchar(255) DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vmail"."share_folder" (
	"from_user" varchar(255) NOT NULL,
	"to_user" varchar(255) NOT NULL,
	"dummy" char(1),
	CONSTRAINT "share_folder_from_user_to_user_pk" PRIMARY KEY("from_user","to_user")
);
--> statement-breakpoint
CREATE TABLE "vmail"."used_quota" (
	"username" varchar(255) NOT NULL,
	"bytes" bigint DEFAULT 0 NOT NULL,
	"messages" bigint DEFAULT 0 NOT NULL,
	"domain" varchar(255) DEFAULT '' NOT NULL,
	CONSTRAINT "used_quota_username_pk" PRIMARY KEY("username")
);
--> statement-breakpoint
CREATE TABLE "mail_app"."email_template" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"name" text NOT NULL,
	"subject" text,
	"body" text,
	"to" jsonb,
	"cc" jsonb,
	"created_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"updated_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_app"."note" (
	"id" text PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"thread_id" text NOT NULL,
	"content" text NOT NULL,
	"color" text DEFAULT 'default' NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"updated_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_app"."summary" (
	"message_id" text PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"saved" boolean DEFAULT false NOT NULL,
	"tags" text,
	"suggested_reply" text,
	"created_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"updated_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_app"."user_hotkeys" (
	"username" varchar(255) PRIMARY KEY NOT NULL,
	"shortcuts" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"updated_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_app"."user_settings" (
	"username" varchar(255) PRIMARY KEY NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	"updated_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_app"."writing_style_matrix" (
	"username" varchar(255) NOT NULL,
	"num_messages" integer NOT NULL,
	"style" jsonb NOT NULL,
	"updated_at" timestamp DEFAULT now()::timestamp without time zone NOT NULL,
	CONSTRAINT "writing_style_matrix_username_pk" PRIMARY KEY("username")
);
--> statement-breakpoint
ALTER TABLE "mail_app"."email_template" ADD CONSTRAINT "email_template_username_mailbox_username_fk" FOREIGN KEY ("username") REFERENCES "vmail"."mailbox"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_app"."note" ADD CONSTRAINT "note_username_mailbox_username_fk" FOREIGN KEY ("username") REFERENCES "vmail"."mailbox"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_app"."summary" ADD CONSTRAINT "summary_username_mailbox_username_fk" FOREIGN KEY ("username") REFERENCES "vmail"."mailbox"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_app"."user_hotkeys" ADD CONSTRAINT "user_hotkeys_username_mailbox_username_fk" FOREIGN KEY ("username") REFERENCES "vmail"."mailbox"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_app"."user_settings" ADD CONSTRAINT "user_settings_username_mailbox_username_fk" FOREIGN KEY ("username") REFERENCES "vmail"."mailbox"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mail_app"."writing_style_matrix" ADD CONSTRAINT "writing_style_matrix_username_mailbox_username_fk" FOREIGN KEY ("username") REFERENCES "vmail"."mailbox"("username") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_admin_passwordlastchange" ON "vmail"."admin" USING btree ("passwordlastchange");--> statement-breakpoint
CREATE INDEX "idx_admin_expired" ON "vmail"."admin" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_admin_active" ON "vmail"."admin" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_alias_domain" ON "vmail"."alias" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_alias_expired" ON "vmail"."alias" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_alias_active" ON "vmail"."alias" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_alias_domain_target_domain" ON "vmail"."alias_domain" USING btree ("target_domain");--> statement-breakpoint
CREATE INDEX "idx_alias_domain_active" ON "vmail"."alias_domain" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_deleted_mailboxes_timestamp" ON "vmail"."deleted_mailboxes" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_deleted_mailboxes_username" ON "vmail"."deleted_mailboxes" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_deleted_mailboxes_domain" ON "vmail"."deleted_mailboxes" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_deleted_mailboxes_admin" ON "vmail"."deleted_mailboxes" USING btree ("admin");--> statement-breakpoint
CREATE INDEX "idx_delete_date" ON "vmail"."deleted_mailboxes" USING btree ("delete_date");--> statement-breakpoint
CREATE INDEX "idx_domain_backupmx" ON "vmail"."domain" USING btree ("backupmx");--> statement-breakpoint
CREATE INDEX "idx_domain_expired" ON "vmail"."domain" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_domain_active" ON "vmail"."domain" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_domain_admins_username" ON "vmail"."domain_admins" USING btree ("username");--> statement-breakpoint
CREATE INDEX "idx_domain_admins_domain" ON "vmail"."domain_admins" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_domain_admins_active" ON "vmail"."domain_admins" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_forwardings_address" ON "vmail"."forwardings" USING btree ("address");--> statement-breakpoint
CREATE INDEX "idx_forwardings_forwarding" ON "vmail"."forwardings" USING btree ("forwarding");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_forwardings_address_forwarding" ON "vmail"."forwardings" USING btree ("address","forwarding");--> statement-breakpoint
CREATE INDEX "idx_forwardings_domain" ON "vmail"."forwardings" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_forwardings_dest_domain" ON "vmail"."forwardings" USING btree ("dest_domain");--> statement-breakpoint
CREATE INDEX "idx_forwardings_is_maillist" ON "vmail"."forwardings" USING btree ("is_maillist");--> statement-breakpoint
CREATE INDEX "idx_forwardings_is_list" ON "vmail"."forwardings" USING btree ("is_list");--> statement-breakpoint
CREATE INDEX "idx_forwardings_is_forwarding" ON "vmail"."forwardings" USING btree ("is_forwarding");--> statement-breakpoint
CREATE INDEX "idx_forwardings_is_alias" ON "vmail"."forwardings" USING btree ("is_alias");--> statement-breakpoint
CREATE INDEX "idx_last_login_domain" ON "vmail"."last_login" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_last_login_imap" ON "vmail"."last_login" USING btree ("imap");--> statement-breakpoint
CREATE INDEX "idx_last_login_pop3" ON "vmail"."last_login" USING btree ("pop3");--> statement-breakpoint
CREATE INDEX "idx_last_login_lda" ON "vmail"."last_login" USING btree ("lda");--> statement-breakpoint
CREATE INDEX "idx_mailbox_domain" ON "vmail"."mailbox" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_mailbox_department" ON "vmail"."mailbox" USING btree ("department");--> statement-breakpoint
CREATE INDEX "idx_mailbox_employeeid" ON "vmail"."mailbox" USING btree ("employeeid");--> statement-breakpoint
CREATE INDEX "idx_mailbox_isadmin" ON "vmail"."mailbox" USING btree ("isadmin");--> statement-breakpoint
CREATE INDEX "idx_mailbox_isglobaladmin" ON "vmail"."mailbox" USING btree ("isglobaladmin");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablesmtp" ON "vmail"."mailbox" USING btree ("enablesmtp");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablesmtpsecured" ON "vmail"."mailbox" USING btree ("enablesmtpsecured");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablepop3" ON "vmail"."mailbox" USING btree ("enablepop3");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablepop3secured" ON "vmail"."mailbox" USING btree ("enablepop3secured");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enableimap" ON "vmail"."mailbox" USING btree ("enableimap");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enableimapsecured" ON "vmail"."mailbox" USING btree ("enableimapsecured");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enableimaptls" ON "vmail"."mailbox" USING btree ("enableimaptls");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablepop3tls" ON "vmail"."mailbox" USING btree ("enablepop3tls");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablesievetls" ON "vmail"."mailbox" USING btree ("enablesievetls");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enabledeliver" ON "vmail"."mailbox" USING btree ("enabledeliver");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablelda" ON "vmail"."mailbox" USING btree ("enablelda");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablemanagesieve" ON "vmail"."mailbox" USING btree ("enablemanagesieve");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablemanagesievesecured" ON "vmail"."mailbox" USING btree ("enablemanagesievesecured");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablesieve" ON "vmail"."mailbox" USING btree ("enablesieve");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablesievesecured" ON "vmail"."mailbox" USING btree ("enablesievesecured");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablelmtp" ON "vmail"."mailbox" USING btree ("enablelmtp");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enabledsync" ON "vmail"."mailbox" USING btree ("enabledsync");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enableinternal" ON "vmail"."mailbox" USING btree ("enableinternal");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enabledoveadm" ON "vmail"."mailbox" USING btree ("enabledoveadm");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablelib_storage" ON "vmail"."mailbox" USING btree ("enablelib-storage");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablequota_status" ON "vmail"."mailbox" USING btree ("enablequota-status");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enableindexer_worker" ON "vmail"."mailbox" USING btree ("enableindexer-worker");--> statement-breakpoint
CREATE INDEX "idx_mailbox_enablesogo" ON "vmail"."mailbox" USING btree ("enablesogo");--> statement-breakpoint
CREATE INDEX "idx_mailbox_passwordlastchange" ON "vmail"."mailbox" USING btree ("passwordlastchange");--> statement-breakpoint
CREATE INDEX "idx_mailbox_expired" ON "vmail"."mailbox" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_mailbox_active" ON "vmail"."mailbox" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_maillist_owners_address_owner" ON "vmail"."maillist_owners" USING btree ("address","owner");--> statement-breakpoint
CREATE INDEX "idx_maillist_owners_owner" ON "vmail"."maillist_owners" USING btree ("owner");--> statement-breakpoint
CREATE INDEX "idx_maillist_owners_domain" ON "vmail"."maillist_owners" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_maillist_owners_dest_domain" ON "vmail"."maillist_owners" USING btree ("dest_domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_maillists_address" ON "vmail"."maillists" USING btree ("address");--> statement-breakpoint
CREATE INDEX "idx_maillists_domain" ON "vmail"."maillists" USING btree ("domain");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_maillists_mlid" ON "vmail"."maillists" USING btree ("mlid");--> statement-breakpoint
CREATE INDEX "idx_maillists_is_newsletter" ON "vmail"."maillists" USING btree ("is_newsletter");--> statement-breakpoint
CREATE INDEX "idx_maillists_active" ON "vmail"."maillists" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_moderators_address" ON "vmail"."moderators" USING btree ("address");--> statement-breakpoint
CREATE INDEX "idx_moderators_moderator" ON "vmail"."moderators" USING btree ("moderator");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_moderators_address_moderator" ON "vmail"."moderators" USING btree ("address","moderator");--> statement-breakpoint
CREATE INDEX "idx_moderators_domain" ON "vmail"."moderators" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_moderators_dest_domain" ON "vmail"."moderators" USING btree ("dest_domain");--> statement-breakpoint
CREATE INDEX "idx_recipient_bcc_domain_bcc_address" ON "vmail"."recipient_bcc_domain" USING btree ("bcc_address");--> statement-breakpoint
CREATE INDEX "idx_recipient_bcc_domain_expired" ON "vmail"."recipient_bcc_domain" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_recipient_bcc_domain_active" ON "vmail"."recipient_bcc_domain" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_recipient_bcc_user_bcc_address" ON "vmail"."recipient_bcc_user" USING btree ("bcc_address");--> statement-breakpoint
CREATE INDEX "idx_recipient_bcc_user_expired" ON "vmail"."recipient_bcc_user" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_recipient_bcc_user_active" ON "vmail"."recipient_bcc_user" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_domain_bcc_address" ON "vmail"."sender_bcc_domain" USING btree ("bcc_address");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_domain_expired" ON "vmail"."sender_bcc_domain" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_domain_active" ON "vmail"."sender_bcc_domain" USING btree ("active");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_user_bcc_address" ON "vmail"."sender_bcc_user" USING btree ("bcc_address");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_user_domain" ON "vmail"."sender_bcc_user" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_user_expired" ON "vmail"."sender_bcc_user" USING btree ("expired");--> statement-breakpoint
CREATE INDEX "idx_sender_bcc_user_active" ON "vmail"."sender_bcc_user" USING btree ("active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_sender_relayhost_account" ON "vmail"."sender_relayhost" USING btree ("account");--> statement-breakpoint
CREATE INDEX "idx_share_folder_from_user" ON "vmail"."share_folder" USING btree ("from_user");--> statement-breakpoint
CREATE INDEX "idx_share_folder_to_user" ON "vmail"."share_folder" USING btree ("to_user");--> statement-breakpoint
CREATE INDEX "idx_used_quota_domain" ON "vmail"."used_quota" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "email_template_username_idx" ON "mail_app"."email_template" USING btree ("username");--> statement-breakpoint
CREATE INDEX "note_username_idx" ON "mail_app"."note" USING btree ("username");--> statement-breakpoint
CREATE INDEX "note_thread_id_idx" ON "mail_app"."note" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "note_user_thread_idx" ON "mail_app"."note" USING btree ("username","thread_id");--> statement-breakpoint
CREATE INDEX "note_is_pinned_idx" ON "mail_app"."note" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "summary_username_idx" ON "mail_app"."summary" USING btree ("username");--> statement-breakpoint
CREATE INDEX "summary_username_saved_idx" ON "mail_app"."summary" USING btree ("username","saved");--> statement-breakpoint
CREATE INDEX "summary_saved_idx" ON "mail_app"."summary" USING btree ("saved");--> statement-breakpoint
CREATE INDEX "user_hotkeys_shortcuts_idx" ON "mail_app"."user_hotkeys" USING btree ("shortcuts");--> statement-breakpoint
CREATE INDEX "user_settings_settings_idx" ON "mail_app"."user_settings" USING btree ("settings");--> statement-breakpoint
CREATE INDEX "writing_style_matrix_style_idx" ON "mail_app"."writing_style_matrix" USING btree ("style");