ALTER TABLE "shelf_position_log" DROP CONSTRAINT "shelf_position_log_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "shelf_position" ADD COLUMN "current_stock_percent" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "shelf_position_log" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "shelf_position_log" DROP COLUMN "user_id";--> statement-breakpoint
DROP TYPE "public"."shelf_position_log_type";