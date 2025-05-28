import {check, integer, pgEnum, pgTable, serial, timestamp, unique, varchar} from "drizzle-orm/pg-core";
import {organization} from "./organization";
import {relations, sql} from "drizzle-orm";
import {product} from "./product";
import {gatewayDevice} from "./device";
import {notificationLowStock} from "./notifications";
import {user} from "./user";

export const shelf = pgTable('shelf', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_id_sequence' }).primaryKey(),
    organization_id: integer().notNull().references(() => organization.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    shelf_name: varchar({ length: 255 }).notNull(),
    shelf_store_location: varchar({ length: 255 })
});
export const shelfRelations = relations(shelf, ({ one, many }) => ({
    shelf_positions: many(shelfPosition),
    organization: one(organization, { fields: [shelf.organization_id], references: [organization.id] }),
}));
export type TShelf = typeof shelf.$inferSelect;
export type TShelfInsert = typeof shelf.$inferInsert;

export const shelfPosition = pgTable('shelf_position', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_position_id_sequence' }).primaryKey(),
    shelf_id: integer().notNull().references(() => shelf.id),
    product_id: integer().references(() => product.id, { onUpdate: 'cascade', onDelete: 'set null' }),
    row: integer().notNull(),
    column: integer().notNull(),
    low_stock_threshold_percent: integer().notNull().default(20),
    max_current_product_capacity: integer(),
    current_stock_percent: integer().default(0)
}, (table) => [
    unique('row_column_shelf_unique').on(table.shelf_id, table.row, table.column),
    check('minmax_low_stock_threshold', sql`${table.low_stock_threshold_percent} > 0 AND ${table.low_stock_threshold_percent} < 100`),
    check('min_product_capacity', sql`${table.max_current_product_capacity} > 0`),
]);
export const shelfPositionRelations = relations(shelfPosition, ({ one, many }) => ({
    shelf: one(shelf, { fields: [shelfPosition.shelf_id], references: [shelf.id] }),
    product: one(product, { fields: [shelfPosition.product_id], references: [product.id] }),
    shelf_position_logs: many(shelfPositionLog),
    notifications_low_stock: many(notificationLowStock)
}));
export type TShelfPosition = typeof shelfPosition.$inferSelect;
export type TShelfPositionInsert = typeof shelfPosition.$inferInsert;

export const shelfPositionLogTypeEnum = pgEnum('shelf_position_log_type', ['refill', 'auto_check']);
export const shelfPositionLog = pgTable('shelf_position_log', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_position_log_id_sequence' }).primaryKey(),
    type: shelfPositionLogTypeEnum().notNull(),
    user_id: integer().notNull().references(() => user.id, { onUpdate: 'cascade', onDelete: 'set null' }),
    product_id: integer().notNull().references(() => product.id),
    shelf_position_id: integer().notNull().references(() => shelfPosition.id),
    timestamp: timestamp().notNull().default(sql`NOW()`),
    amount_percent: integer().notNull(),
}, (table) => [
    check('minmax_amount_percent', sql`${table.amount_percent} >= 0 AND ${table.amount_percent} <= 100`),
]);
export const shelfPositionLogRelations = relations(shelfPositionLog, ({ one }) => ({
    shelf_position: one(shelfPosition, { fields: [shelfPositionLog.shelf_position_id], references: [shelfPosition.id] }),
    product: one(product, { fields: [shelfPositionLog.product_id], references: [product.id] }),
    user: one(user, { fields: [shelfPositionLog.user_id], references: [user.id] }),
}));
export type TShelfPositionLogEntry = typeof shelfPositionLog.$inferSelect;
export type TShelfPositionLogEntryInsert = typeof shelfPositionLog.$inferInsert;