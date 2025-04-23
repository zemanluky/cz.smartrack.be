import {check, index, integer, pgEnum, pgTable, serial, timestamp} from "drizzle-orm/pg-core";
import {organization} from "./organization";
import {relations, sql} from "drizzle-orm";
import {shelfDevice} from "./device";
import {shelfPosition} from "./shelf";
import {product} from "./product";

export const notificationTypeEnum = pgEnum('notification_type', ['low_stock', 'low_battery']);

export const notification = pgTable('notification', {
    id: integer().generatedByDefaultAsIdentity({ name: 'notification_id_sequence' }).primaryKey(),
    organization_id: integer().notNull().references(() => organization.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    type: notificationTypeEnum().notNull(),
    created_at: timestamp().notNull().default(sql`NOW()`),
    read_at: timestamp()
}, (table) => [
    index('notification_created_idx').on(table.created_at.desc())
]);

export const notificationRelations = relations(notification, ({ one, many }) => ({
    organization: one(organization, { fields: [notification.organization_id], references: [organization.id] }),
    low_stock_notification: one(notificationLowStock, { fields: [notification.id], references: [notificationLowStock.id] }),
    low_battery_notification: one(notificationLowBattery, { fields: [notification.id], references: [notificationLowBattery.id] }),
}));

export const notificationLowStock = pgTable('notification_low_stock', {
    id: integer().primaryKey().references(() => notification.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    shelf_position_id: integer().notNull().references(() => shelfPosition.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    product_id: integer().notNull().references(() => product.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    remaining_amount_percent: integer().notNull(),
}, (table) => [
    check('minmax_amount_percent', sql`${table.remaining_amount_percent} >= 0 AND ${table.remaining_amount_percent} <= 100`),
]);

export const notificationLowStockRelations = relations(notificationLowStock, ({ one }) => ({
    notification: one(notification, { fields: [notificationLowStock.id], references: [notification.id] }),
    shelf_position: one(shelfPosition, { fields: [notificationLowStock.shelf_position_id], references: [shelfPosition.id] }),
    product: one(product, { fields: [notificationLowStock.product_id], references: [product.id] })
}));

export const notificationBatteryStateEnum = pgEnum('notification_battery_state', ['low', 'critical']);

export const notificationLowBattery = pgTable('notification_low_battery', {
    id: integer().primaryKey().references(() => notification.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    shelf_position_device_id: integer().notNull().references(() => shelfDevice.id, ),
    battery_state: notificationBatteryStateEnum().notNull(),
});

export const notificationLowBatteryRelations = relations(notificationLowBattery, ({ one }) => ({
    notification: one(notification, { fields: [notificationLowBattery.id], references: [notification.id] }),
    shelf_position_device: one(shelfDevice, { fields: [notificationLowBattery.shelf_position_device_id], references: [shelfDevice.id] }),
}));