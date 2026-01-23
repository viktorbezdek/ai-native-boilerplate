CREATE TYPE "public"."access_type" AS ENUM('view', 'download', 'copy');--> statement-breakpoint
CREATE TYPE "public"."asset_category" AS ENUM('productivity', 'writing', 'coding', 'analysis', 'creative', 'business', 'education', 'other');--> statement-breakpoint
CREATE TYPE "public"."asset_type" AS ENUM('prompt', 'chain', 'skill', 'agent');--> statement-breakpoint
CREATE TYPE "public"."model_compatibility" AS ENUM('openai', 'anthropic', 'google', 'open-source', 'universal');--> statement-breakpoint
CREATE TABLE "asset_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"access_type" "access_type" NOT NULL,
	"format" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text NOT NULL,
	"content" jsonb NOT NULL,
	"type" "asset_type" NOT NULL,
	"category" "asset_category" NOT NULL,
	"model_compatibility" text[] NOT NULL,
	"sample_input" text,
	"sample_output" text,
	"is_free" boolean DEFAULT false NOT NULL,
	"is_published" boolean DEFAULT false NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"download_count" integer DEFAULT 0 NOT NULL,
	"tags" text[] DEFAULT '{}',
	"version" text DEFAULT '1.0.0' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "assets_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_recently_viewed" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"asset_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "asset_access" ADD CONSTRAINT "asset_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_access" ADD CONSTRAINT "asset_access_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recently_viewed" ADD CONSTRAINT "user_recently_viewed_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_recently_viewed" ADD CONSTRAINT "user_recently_viewed_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_asset_access_user_id" ON "asset_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_asset_access_asset_id" ON "asset_access" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "idx_asset_access_user_asset" ON "asset_access" USING btree ("user_id","asset_id");--> statement-breakpoint
CREATE INDEX "idx_assets_slug" ON "assets" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_assets_type" ON "assets" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_assets_category" ON "assets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_assets_is_free" ON "assets" USING btree ("is_free");--> statement-breakpoint
CREATE INDEX "idx_assets_is_published" ON "assets" USING btree ("is_published");--> statement-breakpoint
CREATE INDEX "idx_assets_published_at" ON "assets" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "idx_user_recently_viewed_user_id" ON "user_recently_viewed" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_recently_viewed_user_asset" ON "user_recently_viewed" USING btree ("user_id","asset_id");