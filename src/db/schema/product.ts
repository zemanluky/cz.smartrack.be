import {
    boolean, check,
    date,
    decimal,
    index,
    integer,
    numeric,
    pgTable,
    serial,
    timestamp,
    uniqueIndex,
    varchar
} from "drizzle-orm/pg-core";
import {organization} from "./organization";
import {relations, sql} from "drizzle-orm";
import {shelfPosition, shelfPositionLog} from "./shelf";
import {notificationLowStock} from "./notifications";

export const product = pgTable('product', {
    id: integer().generatedByDefaultAsIdentity({ name: 'product_id_sequence' }).primaryKey(),
    organization_id: integer().notNull().references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    name: varchar({ length: 255 }).notNull(),
    price: numeric({ precision: 9, scale: 2, mode: 'number' }).notNull(),
    deleted_at: timestamp().default(sql`NULL`),
}, (table) => [
    index('prod_price_idx').on(table.price),
    uniqueIndex('uniq_product_name_org').on(table.name, table.organization_id)
]);

export const productRelations = relations(product, ({ one, many }) => ({
    organization: one(organization, { fields: [product.organization_id], references: [organization.id] }),
    product_discounts: many(productDiscount),
    shelf_positions: many(shelfPosition),
    shelf_position_logs: many(shelfPositionLog),
    notifications_low_stock: many(notificationLowStock),
}));

export type TProduct = typeof product.$inferSelect;
export type TProductInsert = typeof product.$inferInsert;

export const productDiscount = pgTable('product_discount', {
    id: integer().generatedByDefaultAsIdentity({ name: 'product_discount_id_sequence' }).primaryKey(),
    product_id: integer().notNull().references(() => product.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    new_price: numeric({ precision: 9, scale: 2, mode: 'number' }).notNull(),
    discount_percent: integer().notNull(),
    valid_from: date({ mode: 'date' }).notNull(),
    valid_until: date({ mode: 'date' }).notNull(),
    active: boolean().notNull().default(true)
}, (table) => [
    index('prod_disc_valid_from_idx').on(table.valid_from.desc()),
    index('prod_disc_valid_until_idx').on(table.valid_until.desc()),
    check('minmax_discount_percent_check', sql`${table.discount_percent} >= 0 AND ${table.discount_percent} <= 100`)
]);

export const productDiscountRelations = relations(productDiscount, ({ one }) => ({
    product: one(product, { fields: [productDiscount.product_id], references: [product.id] }),
}));

export type TProductDiscount = typeof productDiscount.$inferSelect;
export type TProductDiscountInsert = typeof productDiscount.$inferInsert;