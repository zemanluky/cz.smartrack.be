import {check, integer, pgTable, serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {relations, sql} from "drizzle-orm";
import {notificationLowBattery} from "./notifications";
import {shelfPosition} from "./shelf";

export const shelfPositionDevice = pgTable('shelf_position_device', {
    id: serial().primaryKey(),
    serial_number: varchar({ length: 255 }).notNull().unique(),
    current_battery_percent: integer(),
    last_connected: timestamp()
}, (table) => [
    check('valid_battery_range_check', sql`${table.current_battery_percent} >= 0 AND ${table.current_battery_percent} <= 100`),
]);

export const shelfPositionDeviceRelations = relations(shelfPositionDevice, ({ many }) => ({
    shelf_position_device_status_logs: many(shelfPositionDeviceStatusLog),
    low_battery_notifications: many(notificationLowBattery),
    shelf_positions: many(shelfPosition)
}));

export const shelfPositionDeviceStatusLog = pgTable('shelf_position_device_status_log', {
    id: serial().primaryKey(),
    shelf_position_device_id: integer().notNull().references(() => shelfPositionDevice.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    timestamp: timestamp().notNull().default(sql`NOW()`),
    battery_percent: integer().notNull(),
}, (table) => [
    check('valid_battery_range_check', sql`${table.battery_percent} >= 0 AND ${table.battery_percent} <= 100`),
]);

export const shelfPositionDeviceStatusLogRelations = relations(shelfPositionDeviceStatusLog, ({ one }) => ({
    shelf_position_device: one(shelfPositionDevice, { fields: [shelfPositionDeviceStatusLog.shelf_position_device_id], references: [shelfPositionDevice.id] }),
}));