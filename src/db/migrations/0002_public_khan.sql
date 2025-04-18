ALTER TABLE "product" DROP CONSTRAINT "product_name_unique";--> statement-breakpoint
DROP INDEX "prod_name_idx";--> statement-breakpoint
DROP INDEX "org_name_idx";--> statement-breakpoint
ALTER TABLE "product" ALTER COLUMN "deleted_at" SET DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "user_refresh_token" ALTER COLUMN "revoked_at" SET DEFAULT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uniq_product_name_org" ON "product" USING btree ("name","organization_id");--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_name_unique" UNIQUE("name");