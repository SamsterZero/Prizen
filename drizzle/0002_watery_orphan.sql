CREATE TABLE "marketplace_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"marketplace_slug" varchar(64) NOT NULL,
	"data_source" varchar(24) DEFAULT 'html' NOT NULL,
	"secret_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "marketplace_configurations" ADD CONSTRAINT "marketplace_configurations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "marketplace_configurations_user_slug_unique" ON "marketplace_configurations" USING btree ("user_id","marketplace_slug");