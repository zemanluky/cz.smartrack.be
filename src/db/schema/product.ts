import {boolean, date, decimal, index, integer, pgTable, serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {organization} from "./organization";
import {relations} from "drizzle-orm";
import {shelfPosition, shelfPositionLog} from "./shelf";
import {notificationLowStock} from "./notifications";

export const product = pgTable('product', {
    id: serial().primaryKey(),
    organization_id: integer().notNull().references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    name: varchar({ length: 255 }).notNull().unique(),
    price: decimal({ precision: 9, scale: 2 }).notNull(),
    deleted_at: timestamp(),
}, (table) => [
    index('prod_name_idx').on(table.name),
    index('prod_price_idx').on(table.price),
]);

export const productRelations = relations(product, ({ one, many }) => ({
    organization: one(organization, { fields: [product.organization_id], references: [organization.id] }),
    product_discounts: many(productDiscount),
    shelf_positions: many(shelfPosition),
    shelf_position_logs: many(shelfPositionLog),
    notifications_low_stock: many(notificationLowStock),
}));

export const productDiscount = pgTable('product_discount', {
    id: serial().primaryKey(),
    product_id: integer().notNull().references(() => product.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    new_price: decimal({ precision: 9, scale: 2 }).notNull(),
    valid_from: date().notNull(),
    valid_until: date().notNull(),
    active: boolean().notNull().default(true)
}, (table) => [
    index('prod_disc_valid_from_idx').on(table.valid_from.desc()),
    index('prod_disc_valid_until_idx').on(table.valid_until.desc()),
]);

export const productDiscountRelations = relations(productDiscount, ({ one }) => ({
    product: one(product, { fields: [productDiscount.product_id], references: [product.id] }),
}));