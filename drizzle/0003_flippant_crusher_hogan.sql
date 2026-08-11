CREATE TABLE "maintenance_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" varchar(48) NOT NULL,
	"status" varchar(24) NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "maintenance_events_kind_occurred_at_idx" ON "maintenance_events" USING btree ("kind","occurred_at");