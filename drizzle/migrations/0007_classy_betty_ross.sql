CREATE TABLE "ai_assist_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_id" uuid,
	"post_id" uuid,
	"target_type" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost" integer DEFAULT 0 NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_glossary_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid,
	"post_id" uuid,
	"series_id" uuid,
	"source_text" text NOT NULL,
	"target_text" text NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"note" text,
	"created_by_user_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_provider_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"allowed_languages" jsonb NOT NULL,
	"monthly_token_limit" integer DEFAULT 1000000 NOT NULL,
	"external_send_policy" text DEFAULT 'allow_public_only' NOT NULL,
	"data_retention_label" text DEFAULT '30_days' NOT NULL,
	CONSTRAINT "ai_provider_configs_provider_unique" UNIQUE("provider")
);
--> statement-breakpoint
CREATE TABLE "ai_translation_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"source_hash" text NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"translated_text" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"safety_decision" text,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "ai_translation_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"user_id" uuid NOT NULL,
	"creator_id" uuid,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"prompt_version" text NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"safety_decision" text
);
--> statement-breakpoint
CREATE TABLE "ai_translation_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"draft_id" uuid NOT NULL,
	"source_text_hash" text NOT NULL,
	"source_text_preview" text NOT NULL,
	"translated_text" text NOT NULL,
	"start_ms" integer,
	"end_ms" integer,
	"anchor_data" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_translation_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"track_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"approval_state" text NOT NULL,
	"note" text,
	"decided_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fan_translation_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"post_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"contribution_type" text NOT NULL,
	"source_language" text NOT NULL,
	"target_language" text NOT NULL,
	"locale" text,
	"title" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"approval_state" text DEFAULT 'unreviewed' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_archive_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stream_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"archive_media_id" uuid,
	"archive_post_id" uuid,
	"error" text,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stream_chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stream_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"message" text NOT NULL,
	"status" text DEFAULT 'visible' NOT NULL,
	"safety_decision" text,
	"hidden_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "stream_chat_moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stream_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"action" text NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "stream_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stream_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb,
	"occurred_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stream_tip_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"stream_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"target_amount" integer NOT NULL,
	"current_amount" integer DEFAULT 0 NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "streams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"ended_at" timestamp,
	"embed_url" text,
	"embed_provider" text,
	"poster_media_id" uuid,
	"archive_post_id" uuid
);
--> statement-breakpoint
CREATE TABLE "subtitle_cues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"track_id" uuid NOT NULL,
	"start_ms" integer NOT NULL,
	"end_ms" integer NOT NULL,
	"text" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_annotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"track_id" uuid NOT NULL,
	"anchor_type" text NOT NULL,
	"anchor_data" jsonb NOT NULL,
	"original_text" text,
	"translated_text" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'active' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"track_id" uuid NOT NULL,
	"reporter_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "translation_votes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"track_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"value" text NOT NULL,
	"reason" text
);
--> statement-breakpoint
ALTER TABLE "ai_assist_usage" ADD CONSTRAINT "ai_assist_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assist_usage" ADD CONSTRAINT "ai_assist_usage_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_assist_usage" ADD CONSTRAINT "ai_assist_usage_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_glossary_terms" ADD CONSTRAINT "ai_glossary_terms_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_glossary_terms" ADD CONSTRAINT "ai_glossary_terms_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_glossary_terms" ADD CONSTRAINT "ai_glossary_terms_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_glossary_terms" ADD CONSTRAINT "ai_glossary_terms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_drafts" ADD CONSTRAINT "ai_translation_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_drafts" ADD CONSTRAINT "ai_translation_drafts_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_translation_segments" ADD CONSTRAINT "ai_translation_segments_draft_id_ai_translation_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."ai_translation_drafts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_translation_approvals" ADD CONSTRAINT "creator_translation_approvals_track_id_fan_translation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."fan_translation_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_translation_approvals" ADD CONSTRAINT "creator_translation_approvals_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_translation_tracks" ADD CONSTRAINT "fan_translation_tracks_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fan_translation_tracks" ADD CONSTRAINT "fan_translation_tracks_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_archive_requests" ADD CONSTRAINT "stream_archive_requests_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_archive_requests" ADD CONSTRAINT "stream_archive_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_archive_requests" ADD CONSTRAINT "stream_archive_requests_archive_media_id_media_assets_id_fk" FOREIGN KEY ("archive_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_archive_requests" ADD CONSTRAINT "stream_archive_requests_archive_post_id_posts_id_fk" FOREIGN KEY ("archive_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_chat_messages" ADD CONSTRAINT "stream_chat_messages_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_chat_messages" ADD CONSTRAINT "stream_chat_messages_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_chat_moderation_actions" ADD CONSTRAINT "stream_chat_moderation_actions_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_chat_moderation_actions" ADD CONSTRAINT "stream_chat_moderation_actions_message_id_stream_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."stream_chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_chat_moderation_actions" ADD CONSTRAINT "stream_chat_moderation_actions_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_events" ADD CONSTRAINT "stream_events_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stream_tip_goals" ADD CONSTRAINT "stream_tip_goals_stream_id_streams_id_fk" FOREIGN KEY ("stream_id") REFERENCES "public"."streams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_poster_media_id_media_assets_id_fk" FOREIGN KEY ("poster_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "streams" ADD CONSTRAINT "streams_archive_post_id_posts_id_fk" FOREIGN KEY ("archive_post_id") REFERENCES "public"."posts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subtitle_cues" ADD CONSTRAINT "subtitle_cues_track_id_fan_translation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."fan_translation_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_annotations" ADD CONSTRAINT "translation_annotations_track_id_fan_translation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."fan_translation_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_reports" ADD CONSTRAINT "translation_reports_track_id_fan_translation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."fan_translation_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_reports" ADD CONSTRAINT "translation_reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_votes" ADD CONSTRAINT "translation_votes_track_id_fan_translation_tracks_id_fk" FOREIGN KEY ("track_id") REFERENCES "public"."fan_translation_tracks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translation_votes" ADD CONSTRAINT "translation_votes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_assist_usage_user_generated_idx" ON "ai_assist_usage" USING btree ("user_id","generated_at");--> statement-breakpoint
CREATE INDEX "ai_glossary_terms_creator_lang_idx" ON "ai_glossary_terms" USING btree ("creator_id","source_language","target_language");--> statement-breakpoint
CREATE INDEX "ai_provider_configs_enabled_idx" ON "ai_provider_configs" USING btree ("enabled");--> statement-breakpoint
CREATE UNIQUE INDEX "ai_translation_cache_source_uidx" ON "ai_translation_cache" USING btree ("target_type","target_id","source_hash","target_language");--> statement-breakpoint
CREATE INDEX "ai_translation_drafts_target_idx" ON "ai_translation_drafts" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "ai_translation_drafts_user_idx" ON "ai_translation_drafts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ai_translation_segments_draft_sort_idx" ON "ai_translation_segments" USING btree ("draft_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_translation_approvals_track_creator_uidx" ON "creator_translation_approvals" USING btree ("track_id","creator_id");--> statement-breakpoint
CREATE INDEX "fan_translation_tracks_post_status_idx" ON "fan_translation_tracks" USING btree ("post_id","status");--> statement-breakpoint
CREATE INDEX "stream_archive_requests_stream_status_idx" ON "stream_archive_requests" USING btree ("stream_id","status");--> statement-breakpoint
CREATE INDEX "stream_chat_messages_stream_created_idx" ON "stream_chat_messages" USING btree ("stream_id","created_at");--> statement-breakpoint
CREATE INDEX "stream_chat_moderation_actions_stream_idx" ON "stream_chat_moderation_actions" USING btree ("stream_id");--> statement-breakpoint
CREATE INDEX "stream_events_stream_occurred_idx" ON "stream_events" USING btree ("stream_id","occurred_at");--> statement-breakpoint
CREATE INDEX "stream_tip_goals_stream_sort_idx" ON "stream_tip_goals" USING btree ("stream_id","sort_order");--> statement-breakpoint
CREATE INDEX "streams_creator_status_idx" ON "streams" USING btree ("creator_id","status");--> statement-breakpoint
CREATE INDEX "subtitle_cues_track_sort_idx" ON "subtitle_cues" USING btree ("track_id","sort_order");--> statement-breakpoint
CREATE INDEX "translation_annotations_track_idx" ON "translation_annotations" USING btree ("track_id");--> statement-breakpoint
CREATE INDEX "translation_reports_track_status_idx" ON "translation_reports" USING btree ("track_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "translation_votes_track_user_uidx" ON "translation_votes" USING btree ("track_id","user_id");