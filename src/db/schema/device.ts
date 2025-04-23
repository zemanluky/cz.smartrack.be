import {char, check, integer, pgTable, serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {relations, sql} from "drizzle-orm";
import {notificationLowBattery} from "./notifications";
import {shelf} from "./shelf";

export const shelfDevice = pgTable('shelf_device', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_device_id_sequence' }).primaryKey(),
    serial_number: varchar({ length: 255 }).notNull().unique(),
    device_secret: char({ length: 72 }).notNull(),
    current_battery_percent: integer(),
    last_connected: timestamp()
}, (table) => [
    check('valid_battery_range_check', sql`${table.current_battery_percent} >= 0 AND ${table.current_battery_percent} <= 100`),
]);
export const shelfPositionDeviceRelations = relations(shelfDevice, ({ one, many }) => ({
    shelf_device_status_logs: many(shelfDeviceStatusLog),
    low_battery_notifications: many(notificationLowBattery),
    shelf: one(shelf)
}));
export type TShelfDevice = typeof shelfDevice.$inferSelect;
export type TShelfDeviceInsert = typeof shelfDevice.$inferInsert;

export const shelfDeviceStatusLog = pgTable('shelf_device_status_log', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_device_status_log_id_sequence' }).primaryKey(),
    shelf_device_id: integer().notNull().references(() => shelfDevice.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    timestamp: timestamp().notNull().default(sql`NOW()`),
    battery_percent: integer().notNull(),
}, (table) => [
    check('valid_battery_range_check', sql`${table.battery_percent} >= 0 AND ${table.battery_percent} <= 100`),
]);
export const shelfPositionDeviceStatusLogRelations = relations(shelfDeviceStatusLog, ({ one }) => ({
    shelf_position_device: one(shelfDevice, { fields: [shelfDeviceStatusLog.shelf_device_id], references: [shelfDevice.id] }),
}));
export type TShelfDeviceStatusLog = typeof shelfDeviceStatusLog.$inferSelect;
export type TShelfDeviceStatusLogInsert = typeof shelfDeviceStatusLog.$inferInsert;