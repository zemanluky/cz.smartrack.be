ALTER TABLE "shelf_position_device" RENAME TO "shelf_device";--> statement-breakpoint
ALTER TABLE "shelf_position_device_status_log" RENAME TO "shelf_device_status_log";--> statement-breakpoint
ALTER TABLE "shelf_device_status_log" RENAME COLUMN "shelf_position_device_id" TO "shelf_device_id";--> statement-breakpoint
ALTER TABLE "shelf_device" DROP CONSTRAINT "shelf_position_device_serial_number_unique";--> statement-breakpoint
ALTER TABLE "shelf_device" DROP CONSTRAINT "valid_battery_range_check";--> statement-breakpoint
ALTER TABLE "shelf_device_status_log" DROP CONSTRAINT "valid_battery_range_check";--> statement-breakpoint
ALTER TABLE "notification_low_battery" DROP CONSTRAINT "notification_low_battery_shelf_position_device_id_shelf_position_device_id_fk";
--> statement-breakpoint
ALTER TABLE "shelf_position" DROP CONSTRAINT "shelf_position_device_id_shelf_position_device_id_fk";
--> statement-breakpoint
ALTER TABLE "shelf_device_status_log" DROP CONSTRAINT "shelf_position_device_status_log_shelf_position_device_id_shelf_position_device_id_fk";
--> statement-breakpoint
ALTER TABLE "shelf" ADD COLUMN "device_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "shelf_device" ADD COLUMN "device_secret" char(72) NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_low_battery" ADD CONSTRAINT "notification_low_battery_shelf_position_device_id_shelf_device_id_fk" FOREIGN KEY ("shelf_position_device_id") REFERENCES "public"."shelf_device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf" ADD CONSTRAINT "shelf_device_id_shelf_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."shelf_device"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelf_device_status_log" ADD CONSTRAINT "shelf_device_status_log_shelf_device_id_shelf_device_id_fk" FOREIGN KEY ("shelf_device_id") REFERENCES "public"."shelf_device"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelf_position" DROP COLUMN "device_id";--> statement-breakpoint
ALTER TABLE "shelf_position" ADD CONSTRAINT "row_column_shelf_unique" UNIQUE("shelf_id","row","column");--> statement-breakpoint
ALTER TABLE "shelf_device" ADD CONSTRAINT "shelf_device_serial_number_unique" UNIQUE("serial_number");--> statement-breakpoint
ALTER TABLE "shelf_device" ADD CONSTRAINT "valid_battery_range_check" CHECK ("shelf_device"."current_battery_percent" >= 0 AND "shelf_device"."current_battery_percent" <= 100);--> statement-breakpoint
ALTER TABLE "shelf_device_status_log" ADD CONSTRAINT "valid_battery_range_check" CHECK ("shelf_device_status_log"."battery_percent" >= 0 AND "shelf_device_status_log"."battery_percent" <= 100);