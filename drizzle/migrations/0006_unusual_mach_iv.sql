CREATE TABLE "achievement_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"scope" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"condition_type" text NOT NULL,
	"condition_config" jsonb NOT NULL,
	"repeatability" text DEFAULT 'once' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "achievement_unlocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"achievement_id" uuid NOT NULL,
	"scope" text NOT NULL,
	"creator_id" uuid,
	"user_id" uuid,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"source_event_id" uuid,
	"notification_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_alert_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"alert_type" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"source_domain" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"creator_id" uuid,
	"target_type" text,
	"target_id" uuid,
	"occurred_at" timestamp NOT NULL,
	"metadata" jsonb,
	"idempotency_key" text NOT NULL,
	"ingested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"job_type" text NOT NULL,
	"target_date" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "creator_daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"date" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"followers_delta" integer DEFAULT 0 NOT NULL,
	"free_members_delta" integer DEFAULT 0 NOT NULL,
	"paid_members_delta" integer DEFAULT 0 NOT NULL,
	"cancellations" integer DEFAULT 0 NOT NULL,
	"active_supporters" integer DEFAULT 0 NOT NULL,
	"post_views" integer DEFAULT 0 NOT NULL,
	"comments" integer DEFAULT 0 NOT NULL,
	"translation_submissions" integer DEFAULT 0 NOT NULL,
	"stream_attendance" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_membership_daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"date" text NOT NULL,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"summary" text NOT NULL,
	"metrics" jsonb NOT NULL,
	"notable_events" jsonb NOT NULL,
	"notification_status" text DEFAULT 'pending' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fan_activity_daily_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"fan_user_id" uuid NOT NULL,
	"date" text NOT NULL,
	"activity_score" integer DEFAULT 0 NOT NULL,
	"event_counts" jsonb NOT NULL,
	"last_activity_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notification_id" uuid,
	"request_id" uuid,
	"channel" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"provider" text,
	"provider_message_id" text,
	"attempted_at" timestamp,
	"delivered_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "notification_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"platform" text NOT NULL,
	"token_ciphertext" text NOT NULL,
	"device_name" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"revoked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_digest_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"digest_key" text NOT NULL,
	"timezone" text DEFAULT 'Asia/Tokyo' NOT NULL,
	"send_hour" integer DEFAULT 9 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"notification_type" text NOT NULL,
	"channel" text NOT NULL,
	"delivery_mode" text DEFAULT 'immediate' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"audience_type" text DEFAULT 'user' NOT NULL,
	"notification_type" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"payload" jsonb,
	"source_domain" text NOT NULL,
	"source_event_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"notification_type" text NOT NULL,
	"channel" text NOT NULL,
	"locale" text DEFAULT 'ja' NOT NULL,
	"title_template" text NOT NULL,
	"body_template" text,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid,
	"notification_type" text NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"payload" jsonb,
	"source_domain" text NOT NULL,
	"source_event_id" text NOT NULL,
	"read_at" timestamp,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text DEFAULT 'viewer' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"due_date" timestamp,
	"status" text DEFAULT 'planned' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_related_media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_related_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" uuid NOT NULL,
	"post_id" uuid NOT NULL,
	"relation_type" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" uuid NOT NULL,
	"milestone_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'todo' NOT NULL,
	"assignee_id" uuid,
	"due_date" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "project_updates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"tier_ids" jsonb NOT NULL,
	"published_at" timestamp,
	"created_by" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"cover_media_id" uuid,
	"started_at" timestamp,
	"target_date" timestamp,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "system_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"source_domain" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" uuid,
	"target_type" text,
	"target_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"case_id" uuid NOT NULL,
	"requester_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"resolved_by_user_id" uuid,
	"resolution_reason" text,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "trust_case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"case_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" uuid,
	"summary" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "trust_case_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"report_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"case_type" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"primary_target_type" text NOT NULL,
	"primary_target_id" uuid,
	"assigned_staff_id" uuid,
	"opened_by_user_id" uuid,
	"resolved_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "trust_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"case_id" uuid NOT NULL,
	"decision_type" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"creator_visible_summary" text,
	"user_visible_summary" text,
	"internal_rationale" text NOT NULL,
	"decided_by_user_id" uuid NOT NULL,
	"decided_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_internal_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"case_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"body" text NOT NULL,
	"visibility" text DEFAULT 'staff_only' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trust_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"reporter_id" uuid,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"reason" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "trust_staff_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"case_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"action_type" text NOT NULL,
	"target_type" text,
	"target_id" uuid,
	"reason" text,
	"metadata" jsonb
);
--> statement-breakpoint
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_achievement_id_achievement_definitions_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievement_definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "achievement_unlocks" ADD CONSTRAINT "achievement_unlocks_source_event_id_analytics_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "public"."analytics_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_alert_candidates" ADD CONSTRAINT "analytics_alert_candidates_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_daily_metrics" ADD CONSTRAINT "creator_daily_metrics_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_membership_daily_summaries" ADD CONSTRAINT "creator_membership_daily_summaries_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_activity_daily_metrics" ADD CONSTRAINT "fan_activity_daily_metrics_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_activity_daily_metrics" ADD CONSTRAINT "fan_activity_daily_metrics_fan_user_id_users_id_fk" FOREIGN KEY ("fan_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_request_id_notification_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."notification_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_devices" ADD CONSTRAINT "notification_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_digest_preferences" ADD CONSTRAINT "notification_digest_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_requests" ADD CONSTRAINT "notification_requests_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_notification_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."notification_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_collaborators" ADD CONSTRAINT "project_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_milestones" ADD CONSTRAINT "project_milestones_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_related_media" ADD CONSTRAINT "project_related_media_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_related_media" ADD CONSTRAINT "project_related_media_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_related_posts" ADD CONSTRAINT "project_related_posts_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_related_posts" ADD CONSTRAINT "project_related_posts_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_milestone_id_project_milestones_id_fk" FOREIGN KEY ("milestone_id") REFERENCES "public"."project_milestones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_updates" ADD CONSTRAINT "project_updates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_cover_media_id_media_assets_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_audit_events" ADD CONSTRAINT "system_audit_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_appeals" ADD CONSTRAINT "trust_appeals_case_id_trust_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_appeals" ADD CONSTRAINT "trust_appeals_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_appeals" ADD CONSTRAINT "trust_appeals_resolved_by_user_id_users_id_fk" FOREIGN KEY ("resolved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_case_events" ADD CONSTRAINT "trust_case_events_case_id_trust_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_case_events" ADD CONSTRAINT "trust_case_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_case_reports" ADD CONSTRAINT "trust_case_reports_case_id_trust_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_case_reports" ADD CONSTRAINT "trust_case_reports_report_id_trust_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."trust_reports"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_cases" ADD CONSTRAINT "trust_cases_assigned_staff_id_users_id_fk" FOREIGN KEY ("assigned_staff_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_cases" ADD CONSTRAINT "trust_cases_opened_by_user_id_users_id_fk" FOREIGN KEY ("opened_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_decisions" ADD CONSTRAINT "trust_decisions_case_id_trust_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_decisions" ADD CONSTRAINT "trust_decisions_decided_by_user_id_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_internal_notes" ADD CONSTRAINT "trust_internal_notes_case_id_trust_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_internal_notes" ADD CONSTRAINT "trust_internal_notes_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_reports" ADD CONSTRAINT "trust_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_staff_actions" ADD CONSTRAINT "trust_staff_actions_case_id_trust_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."trust_cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trust_staff_actions" ADD CONSTRAINT "trust_staff_actions_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "achievement_definitions_key_uidx" ON "achievement_definitions" USING btree ("key");--> statement-breakpoint
CREATE INDEX "achievement_definitions_enabled_idx" ON "achievement_definitions" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "achievement_unlocks_scope_uidx" ON "achievement_unlocks" USING btree ("achievement_id","scope","creator_id","user_id");--> statement-breakpoint
CREATE INDEX "analytics_alerts_creator_status_idx" ON "analytics_alert_candidates" USING btree ("creator_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_events_idempotency_key_uidx" ON "analytics_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "analytics_events_creator_occurred_idx" ON "analytics_events" USING btree ("creator_id","occurred_at");--> statement-breakpoint
CREATE INDEX "analytics_events_source_event_idx" ON "analytics_events" USING btree ("source_domain","event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "analytics_jobs_type_target_uidx" ON "analytics_jobs" USING btree ("job_type","target_date");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_daily_metrics_creator_date_uidx" ON "creator_daily_metrics" USING btree ("creator_id","date","timezone");--> statement-breakpoint
CREATE UNIQUE INDEX "membership_daily_summaries_creator_date_uidx" ON "creator_membership_daily_summaries" USING btree ("creator_id","date","timezone");--> statement-breakpoint
CREATE UNIQUE INDEX "fan_activity_creator_fan_date_uidx" ON "fan_activity_daily_metrics" USING btree ("creator_id","fan_user_id","date");--> statement-breakpoint
CREATE INDEX "notification_deliveries_notification_idx" ON "notification_deliveries" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "notification_deliveries_request_idx" ON "notification_deliveries" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "notification_devices_user_idx" ON "notification_devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_devices_active_idx" ON "notification_devices" USING btree ("user_id","revoked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_digest_preferences_uidx" ON "notification_digest_preferences" USING btree ("user_id","digest_key");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_preferences_uidx" ON "notification_preferences" USING btree ("user_id","notification_type","channel");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_requests_idempotency_uidx" ON "notification_requests" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "notification_requests_recipient_idx" ON "notification_requests" USING btree ("recipient_user_id");--> statement-breakpoint
CREATE INDEX "notification_requests_source_idx" ON "notification_requests" USING btree ("source_domain","source_event_id");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_templates_uidx" ON "notification_templates" USING btree ("notification_type","channel","locale");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_read_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_source_user_uidx" ON "notifications" USING btree ("user_id","source_domain","source_event_id","notification_type");--> statement-breakpoint
CREATE UNIQUE INDEX "project_collaborators_project_user_uidx" ON "project_collaborators" USING btree ("project_id","user_id");--> statement-breakpoint
CREATE INDEX "project_milestones_project_id_idx" ON "project_milestones" USING btree ("project_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_related_media_project_media_uidx" ON "project_related_media" USING btree ("project_id","media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_related_posts_project_post_uidx" ON "project_related_posts" USING btree ("project_id","post_id");--> statement-breakpoint
CREATE INDEX "project_tasks_project_status_idx" ON "project_tasks" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "project_updates_project_published_idx" ON "project_updates" USING btree ("project_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "projects_creator_slug_uidx" ON "projects" USING btree ("creator_id","slug");--> statement-breakpoint
CREATE INDEX "projects_creator_status_idx" ON "projects" USING btree ("creator_id","status");--> statement-breakpoint
CREATE INDEX "system_audit_events_source_event_idx" ON "system_audit_events" USING btree ("source_domain","event_type");--> statement-breakpoint
CREATE INDEX "system_audit_events_actor_idx" ON "system_audit_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "system_audit_events_target_idx" ON "system_audit_events" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "trust_appeals_status_idx" ON "trust_appeals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trust_appeals_case_id_idx" ON "trust_appeals" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "trust_case_events_case_id_idx" ON "trust_case_events" USING btree ("case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "trust_case_reports_case_report_uidx" ON "trust_case_reports" USING btree ("case_id","report_id");--> statement-breakpoint
CREATE INDEX "trust_cases_status_idx" ON "trust_cases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trust_cases_target_idx" ON "trust_cases" USING btree ("primary_target_type","primary_target_id");--> statement-breakpoint
CREATE INDEX "trust_cases_assigned_staff_idx" ON "trust_cases" USING btree ("assigned_staff_id");--> statement-breakpoint
CREATE INDEX "trust_decisions_case_id_idx" ON "trust_decisions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "trust_internal_notes_case_id_idx" ON "trust_internal_notes" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "trust_reports_target_idx" ON "trust_reports" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "trust_reports_status_idx" ON "trust_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "trust_staff_actions_case_id_idx" ON "trust_staff_actions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "trust_staff_actions_staff_idx" ON "trust_staff_actions" USING btree ("staff_user_id");