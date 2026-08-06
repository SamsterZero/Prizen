ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_channel_id_notification_channels_id_fk";
--> statement-breakpoint
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_channel_id_notification_channels_id_fk" FOREIGN KEY ("channel_id") REFERENCES "public"."notification_channels"("id") ON DELETE cascade ON UPDATE no action;