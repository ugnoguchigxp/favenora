CREATE TABLE "allowed_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"language" text DEFAULT 'und' NOT NULL,
	"locale" text,
	"pattern" text NOT NULL,
	"normalized_pattern" text NOT NULL,
	"match_type" text NOT NULL,
	"reason" text,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "blocked_term_matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"check_id" uuid NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"term_id" uuid,
	"matched_text_hash" text NOT NULL,
	"matched_text_preview" text NOT NULL,
	"start_offset" integer NOT NULL,
	"end_offset" integer NOT NULL,
	"severity" text NOT NULL,
	"decision" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"language" text DEFAULT 'und' NOT NULL,
	"locale" text,
	"script" text,
	"category" text NOT NULL,
	"pattern" text NOT NULL,
	"normalized_pattern" text NOT NULL,
	"match_type" text NOT NULL,
	"severity" text NOT NULL,
	"decision" text NOT NULL,
	"context_policy" text DEFAULT 'always' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_by_user_id" uuid
);
--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"purpose" text NOT NULL,
	"user_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"tier_id" uuid,
	"post_id" uuid,
	"stream_id" uuid,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_checkout_session_id" text NOT NULL,
	"url" text,
	"success_url" text NOT NULL,
	"cancel_url" text NOT NULL,
	"expires_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "content_safety_appeals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"review_id" uuid NOT NULL,
	"requester_id" uuid,
	"reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_safety_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"actor_id" uuid,
	"language" text,
	"source" text,
	"text_hash" text NOT NULL,
	"decision" text NOT NULL,
	"max_severity" text NOT NULL,
	"rule_version" integer DEFAULT 1 NOT NULL,
	"checked_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_safety_rescan_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"scope" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"rule_version_from" integer,
	"rule_version_to" integer NOT NULL,
	"started_at" timestamp,
	"finished_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "content_safety_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid,
	"check_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"trust_case_id" uuid,
	"decision" text,
	"reason" text,
	"decided_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "internal_payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payment_event_id" uuid,
	"event_type" text NOT NULL,
	"target_domain" text NOT NULL,
	"target_id" uuid,
	"processed_at" timestamp,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"provider_customer_id" text NOT NULL,
	"default_currency" text DEFAULT 'JPY' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"provider_event_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"raw_body_hash" text NOT NULL,
	"processing_status" text DEFAULT 'received' NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "payment_ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid,
	"user_id" uuid,
	"provider" text NOT NULL,
	"provider_object_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid,
	"entry_type" text NOT NULL,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"occurred_at" timestamp NOT NULL,
	"available_at" timestamp,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"provider" text NOT NULL,
	"provider_payment_id" text NOT NULL,
	"payer_id" uuid,
	"creator_id" uuid,
	"checkout_session_id" uuid,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"paid_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payment_id" uuid,
	"creator_id" uuid,
	"user_id" uuid,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"reason" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_by_user_id" uuid,
	"provider_refund_id" text,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "tips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"payer_id" uuid NOT NULL,
	"creator_id" uuid NOT NULL,
	"post_id" uuid,
	"stream_id" uuid,
	"amount" integer NOT NULL,
	"currency" text NOT NULL,
	"message" text,
	"visibility" text DEFAULT 'creator_only' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"provider_payment_id" text,
	"checkout_session_id" uuid,
	"paid_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "allowed_terms" ADD CONSTRAINT "allowed_terms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_term_matches" ADD CONSTRAINT "blocked_term_matches_check_id_content_safety_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."content_safety_checks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_term_matches" ADD CONSTRAINT "blocked_term_matches_term_id_blocked_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."blocked_terms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blocked_terms" ADD CONSTRAINT "blocked_terms_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_tier_id_membership_tiers_id_fk" FOREIGN KEY ("tier_id") REFERENCES "public"."membership_tiers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_safety_appeals" ADD CONSTRAINT "content_safety_appeals_review_id_content_safety_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."content_safety_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_safety_appeals" ADD CONSTRAINT "content_safety_appeals_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_safety_checks" ADD CONSTRAINT "content_safety_checks_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_safety_reviews" ADD CONSTRAINT "content_safety_reviews_check_id_content_safety_checks_id_fk" FOREIGN KEY ("check_id") REFERENCES "public"."content_safety_checks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_payment_events" ADD CONSTRAINT "internal_payment_events_payment_event_id_payment_events_id_fk" FOREIGN KEY ("payment_event_id") REFERENCES "public"."payment_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_customers" ADD CONSTRAINT "payment_customers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_ledger_entries" ADD CONSTRAINT "payment_ledger_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_payer_id_users_id_fk" FOREIGN KEY ("payer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tips" ADD CONSTRAINT "tips_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "allowed_terms_enabled_idx" ON "allowed_terms" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "allowed_terms_normalized_idx" ON "allowed_terms" USING btree ("normalized_pattern");--> statement-breakpoint
CREATE INDEX "blocked_term_matches_check_id_idx" ON "blocked_term_matches" USING btree ("check_id");--> statement-breakpoint
CREATE INDEX "blocked_terms_enabled_idx" ON "blocked_terms" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "blocked_terms_normalized_idx" ON "blocked_terms" USING btree ("normalized_pattern");--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_provider_session_uidx" ON "checkout_sessions" USING btree ("provider","provider_checkout_session_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_user_id_idx" ON "checkout_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "checkout_sessions_creator_id_idx" ON "checkout_sessions" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "content_safety_appeals_review_id_idx" ON "content_safety_appeals" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "content_safety_checks_target_idx" ON "content_safety_checks" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "content_safety_checks_actor_idx" ON "content_safety_checks" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "content_safety_rescan_jobs_status_idx" ON "content_safety_rescan_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_safety_reviews_status_idx" ON "content_safety_reviews" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_safety_reviews_target_idx" ON "content_safety_reviews" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "internal_payment_events_event_type_idx" ON "internal_payment_events" USING btree ("event_type");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_customers_user_provider_uidx" ON "payment_customers" USING btree ("user_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_customers_provider_customer_uidx" ON "payment_customers" USING btree ("provider","provider_customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_provider_event_uidx" ON "payment_events" USING btree ("provider","provider_event_id");--> statement-breakpoint
CREATE INDEX "payment_events_status_idx" ON "payment_events" USING btree ("processing_status");--> statement-breakpoint
CREATE INDEX "payment_ledger_creator_occurred_idx" ON "payment_ledger_entries" USING btree ("creator_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_provider_payment_uidx" ON "payments" USING btree ("provider","provider_payment_id");--> statement-breakpoint
CREATE INDEX "refunds_creator_id_idx" ON "refunds" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "tips_creator_id_idx" ON "tips" USING btree ("creator_id");