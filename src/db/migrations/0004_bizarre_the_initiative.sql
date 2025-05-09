ALTER TABLE "shelf_positions_device_pairing" ALTER COLUMN "pairing_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "shelf_positions_device" ADD COLUMN "last_reported" timestamp DEFAULT NULL;