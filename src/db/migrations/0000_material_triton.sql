CREATE TYPE "public"."notification_battery_state" AS ENUM('low', 'critical');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('low_stock', 'low_battery');--> statement-breakpoint
CREATE TYPE "public"."shelf_position_log_type" AS ENUM('refill', 'auto_check');--> statement-breakpoint
CREATE TABLE "product" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"price" numeric(9, 2) NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "product_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "product_discount" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"new_price" numeric(9, 2) NOT NULL,
	"valid_from" date NOT NULL,
	"valid_until" date NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"created_at" timestamp DEFAULT NOW() NOT NULL,
	"read_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "notification_low_battery" (
	"id" integer PRIMARY KEY NOT NULL,
	"shelf_position_device_id" integer NOT NULL,
	"battery_state" "notification_battery_state" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_low_stock" (
	"id" integer PRIMARY KEY NOT NULL,
	"shelf_position_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"remaining_amount_percent" integer NOT NULL,
	CONSTRAINT "minmax_amount_percent" CHECK ("notification_low_stock"."remaining_amount_percent" >= 0 AND "notification_low_stock"."remaining_amount_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "shelf" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"shelf_name" varchar(255) NOT NULL,
	"shelf_store_location" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "shelf_position" (
	"id" serial PRIMARY KEY NOT NULL,
	"shelf_id" integer NOT NULL,
	"product_id" integer,
	"device_id" integer NOT NULL,
	"row" integer NOT NULL,
	"column" integer NOT NULL,
	"low_stock_threshold_percent" integer DEFAULT 20 NOT NULL,
	"max_current_product_capacity" integer,
	CONSTRAINT "minmax_low_stock_threshold" CHECK ("shelf_position"."low_stock_threshold_percent" > 0 AND "shelf_position"."low_stock_threshold_percent" < 100),
	CONSTRAINT "min_product_capacity" CHECK ("shelf_position"."max_current_product_capacity" > 0)
);
--> statement-breakpoint
CREATE TABLE "shelf_position_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "shelf_position_log_type" NOT NULL,
	"user_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"shelf_position_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT NOW() NOT NULL,
	"amount_percent" integer NOT NULL,
	CONSTRAINT "minmax_amount_percent" CHECK ("shelf_position_log"."amount_percent" >= 0 AND "shelf_position_log"."amount_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "organization" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelf_position_device" (
	"id" serial PRIMARY KEY NOT NULL,
	"serial_number" varchar(255) NOT NULL,
	"current_battery_percent" integer,
	"last_connected" timestamp,
	CONSTRAINT "shelf_position_device_serial_number_unique" UNIQUE("serial_number"),
	CONSTRAINT "valid_battery_range_check" CHECK ("shelf_position_device"."current_battery_percent" >= 0 AND "shelf_position_device"."current_battery_percent" <= 100)
);
--> statement-breakpoint
CREATE TABLE "shelf_position_device_status_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"shelf_position_device_id" integer NOT NULL,
	"timestamp" timestamp DEFAULT NOW() NOT NULL,
	"battery_percent" integer NOT NULL,
	CONSTRAINT "valid_battery_range_check" CHECK ("shelf_position_device_status_log"."battery_percent" >= 0 AND "shelf_position_device_status_log"."battery_percent" <= 100)
);
--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "product_discount" ADD CONSTRAINT "product_discount_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_low_battery" ADD CONSTRAINT "notification_low_battery_id_notification_id_fk" FOREIGN KEY ("id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_low_battery" ADD CONSTRAINT "notification_low_battery_shelf_position_device_id_shelf_position_device_id_fk" FOREIGN KEY ("shelf_position_device_id") REFERENCES "public"."shelf_position_device"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_low_stock" ADD CONSTRAINT "notification_low_stock_id_notification_id_fk" FOREIGN KEY ("id") REFERENCES "public"."notification"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_low_stock" ADD CONSTRAINT "notification_low_stock_shelf_position_id_shelf_position_id_fk" FOREIGN KEY ("shelf_position_id") REFERENCES "public"."shelf_position"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "notification_low_stock" ADD CONSTRAINT "notification_low_stock_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelf" ADD CONSTRAINT "shelf_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelf_position" ADD CONSTRAINT "shelf_position_shelf_id_shelf_id_fk" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelf"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_position" ADD CONSTRAINT "shelf_position_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelf_position" ADD CONSTRAINT "shelf_position_device_id_shelf_position_device_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."shelf_position_device"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "shelf_position_log" ADD CONSTRAINT "shelf_position_log_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_position_log" ADD CONSTRAINT "shelf_position_log_shelf_position_id_shelf_position_id_fk" FOREIGN KEY ("shelf_position_id") REFERENCES "public"."shelf_position"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_position_device_status_log" ADD CONSTRAINT "shelf_position_device_status_log_shelf_position_device_id_shelf_position_device_id_fk" FOREIGN KEY ("shelf_position_device_id") REFERENCES "public"."shelf_position_device"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "prod_name_idx" ON "product" USING btree ("name");--> statement-breakpoint
CREATE INDEX "prod_price_idx" ON "product" USING btree ("price");--> statement-breakpoint
CREATE INDEX "prod_disc_valid_from_idx" ON "product_discount" USING btree ("valid_from" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "prod_disc_valid_until_idx" ON "product_discount" USING btree ("valid_until" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notification_created_idx" ON "notification" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "org_name_idx" ON "organization" USING btree ("name");