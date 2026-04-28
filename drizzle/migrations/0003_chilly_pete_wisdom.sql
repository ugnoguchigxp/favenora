CREATE TABLE "creator_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "creator_categories_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "creator_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"label" text NOT NULL,
	"url" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_portfolio_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"url" text,
	"media_id" uuid,
	"role" text,
	"completed_at" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profile_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profile_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"visibility" text DEFAULT 'public' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "creator_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"user_id" uuid NOT NULL,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"tagline" text,
	"bio" text,
	"avatar_media_id" uuid,
	"banner_media_id" uuid,
	"public_location_label" text,
	"primary_language" text,
	"translation_contributions_enabled" boolean DEFAULT false NOT NULL,
	"commission_enabled" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"review_status" text DEFAULT 'pending' NOT NULL,
	"review_note" text,
	"published_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "creator_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"creator_id" uuid NOT NULL,
	"label" text NOT NULL,
	"normalized_label" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "follows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"owner_id" uuid NOT NULL,
	"owner_type" text DEFAULT 'user' NOT NULL,
	"media_kind" text DEFAULT 'unknown' NOT NULL,
	"status" text DEFAULT 'pending_upload' NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"provider_key" text NOT NULL,
	"storage_handle" text NOT NULL,
	"original_filename" text,
	"mime_type" text,
	"byte_size" integer,
	"checksum" text,
	"width" integer,
	"height" integer,
	"duration_ms" integer,
	"failure_reason" text,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "media_external_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"url" text NOT NULL,
	"provider_name" text,
	"embed_html" text,
	"thumbnail_url" text,
	"metadata" jsonb,
	"last_fetched_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "media_scan_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"media_id" uuid NOT NULL,
	"scan_type" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"verdict" text DEFAULT 'unknown' NOT NULL,
	"provider_key" text,
	"details" jsonb,
	"scanned_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "media_upload_intents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" uuid NOT NULL,
	"provider_key" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"max_bytes" integer NOT NULL,
	"allowed_mime_types" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"media_id" uuid NOT NULL,
	"usage_type" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"media_id" uuid NOT NULL,
	"variant_kind" text NOT NULL,
	"provider_key" text NOT NULL,
	"storage_handle" text NOT NULL,
	"mime_type" text,
	"byte_size" integer,
	"width" integer,
	"height" integer,
	"duration_ms" integer
);
--> statement-breakpoint
ALTER TABLE "creator_links" ADD CONSTRAINT "creator_links_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_portfolio_items" ADD CONSTRAINT "creator_portfolio_items_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_portfolio_items" ADD CONSTRAINT "creator_portfolio_items_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profile_categories" ADD CONSTRAINT "creator_profile_categories_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profile_categories" ADD CONSTRAINT "creator_profile_categories_category_id_creator_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."creator_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profile_sections" ADD CONSTRAINT "creator_profile_sections_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_avatar_media_id_media_assets_id_fk" FOREIGN KEY ("avatar_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_profiles" ADD CONSTRAINT "creator_profiles_banner_media_id_media_assets_id_fk" FOREIGN KEY ("banner_media_id") REFERENCES "public"."media_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "creator_tags" ADD CONSTRAINT "creator_tags_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_creator_id_creator_profiles_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."creator_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "follows" ADD CONSTRAINT "follows_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_external_sources" ADD CONSTRAINT "media_external_sources_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_scan_results" ADD CONSTRAINT "media_scan_results_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_upload_intents" ADD CONSTRAINT "media_upload_intents_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_usages" ADD CONSTRAINT "media_usages_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_variants" ADD CONSTRAINT "media_variants_media_id_media_assets_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "creator_categories_active_sort_idx" ON "creator_categories" USING btree ("is_active","sort_order");--> statement-breakpoint
CREATE INDEX "creator_links_creator_id_idx" ON "creator_links" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "creator_portfolio_items_creator_id_idx" ON "creator_portfolio_items" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profile_categories_uidx" ON "creator_profile_categories" USING btree ("creator_id","category_id");--> statement-breakpoint
CREATE INDEX "creator_profile_sections_creator_id_idx" ON "creator_profile_sections" USING btree ("creator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profiles_user_id_uidx" ON "creator_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_profiles_slug_uidx" ON "creator_profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "creator_profiles_status_idx" ON "creator_profiles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "creator_tags_creator_label_uidx" ON "creator_tags" USING btree ("creator_id","normalized_label");--> statement-breakpoint
CREATE UNIQUE INDEX "follows_creator_user_uidx" ON "follows" USING btree ("creator_id","user_id");--> statement-breakpoint
CREATE INDEX "follows_user_id_idx" ON "follows" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "media_assets_owner_idx" ON "media_assets" USING btree ("owner_type","owner_id");--> statement-breakpoint
CREATE INDEX "media_assets_status_idx" ON "media_assets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "media_external_sources_media_id_idx" ON "media_external_sources" USING btree ("media_id");--> statement-breakpoint
CREATE INDEX "media_scan_results_media_type_idx" ON "media_scan_results" USING btree ("media_id","scan_type");--> statement-breakpoint
CREATE INDEX "media_upload_intents_media_id_idx" ON "media_upload_intents" USING btree ("media_id");--> statement-breakpoint
CREATE UNIQUE INDEX "media_usages_media_target_uidx" ON "media_usages" USING btree ("media_id","usage_type","target_type","target_id");--> statement-breakpoint
CREATE INDEX "media_variants_media_kind_idx" ON "media_variants" USING btree ("media_id","variant_kind");