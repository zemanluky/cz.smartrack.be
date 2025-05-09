import {
    char,
    check,
    index,
    integer,
    pgTable,
    primaryKey,
    uniqueKeyName,
    serial,
    timestamp,
    unique,
    varchar
} from "drizzle-orm/pg-core";
import {desc, relations, sql} from "drizzle-orm";
import {notificationLowBattery} from "./notifications";
import {shelf, shelfPosition} from "./shelf";

export const gatewayDevice = pgTable('gateway_device', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_device_id_sequence' }).primaryKey(),
    serial_number: varchar({ length: 255 }).notNull().unique(),
    device_secret: varchar({ length: 130 }).notNull(),
    last_connected: timestamp()
}, (table) => [
    index('last_connected_from_newest_idx').on(table.last_connected.desc())
]);
export const gatewayDeviceRelations = relations(gatewayDevice, ({ one, many }) => ({
    shelf_positions_devices: many(shelfPositionsDevice)
}));
export type TGatewayDevice = typeof gatewayDevice.$inferSelect;
export type TGatewayDeviceInsert = typeof gatewayDevice.$inferInsert;

export const shelfPositionsDevice = pgTable('shelf_positions_device', {
    id: integer().primaryKey().generatedByDefaultAsIdentity({ name: 'shelf_positions_device_id_sequence' }),
    gateway_device_id: integer().notNull().references(() => gatewayDevice.id, { onUpdate: 'cascade', onDelete: 'restrict' }),
    serial_number: varchar({ length: 255 }).notNull().unique(),
    number_of_slots: integer().notNull(),
    last_reported: timestamp().default(sql`NULL`),
    current_battery_percent: integer().default(sql`NULL`)
}, (table) => [
    check('valid_battery_range_check', sql`${table.current_battery_percent} >= 0 AND ${table.current_battery_percent} <= 100`),
    check('number_of_slots_min_check', sql`${table.number_of_slots} >= 1`),
]);
export const shelfPositionsDeviceRelations = relations(shelfPositionsDevice, ({ one, many }) => ({
    gateway_device: one(gatewayDevice, { fields: [shelfPositionsDevice.gateway_device_id], references: [gatewayDevice.id] }),
    status_logs: many(shelfPositionsDeviceLogs),
    pairings: many(shelfPositionsDevicePairing)
}));
export type TShelfPositionsDevice = typeof shelfPositionsDevice.$inferSelect;
export type TShelfPositionsDeviceInsert = typeof shelfPositionsDevice.$inferInsert;

export const shelfPositionsDeviceLogs = pgTable('shelf_positions_device_status_log', {
    id: integer().generatedByDefaultAsIdentity({ name: 'shelf_device_status_log_id_sequence' }).primaryKey(),
    shelf_positions_device_id: integer().notNull().references(() => shelfPositionsDevice.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    timestamp: timestamp().notNull().default(sql`NOW()`),
    battery_percent: integer().notNull(),
}, (table) => [
    check('valid_battery_range_check', sql`${table.battery_percent} >= 0 AND ${table.battery_percent} <= 100`),
    index('timestamp_from_newest_idx').on(table.timestamp.desc())
]);
export const shelfPositionDeviceStatusLogRelations = relations(shelfPositionsDeviceLogs, ({ one }) => ({
    shelf_positions_device: one(shelfPositionsDevice, { fields: [shelfPositionsDeviceLogs.shelf_positions_device_id], references: [shelfPositionsDevice.id] }),
}));
export type TShelfDeviceStatusLog = typeof shelfPositionsDeviceLogs.$inferSelect;
export type TShelfDeviceStatusLogInsert = typeof shelfPositionsDeviceLogs.$inferInsert;

export const shelfPositionsDevicePairing = pgTable('shelf_positions_device_pairing', {
    shelf_positions_device_id: integer().notNull().references(() => shelfPositionsDevice.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    slot_number: integer().notNull(),
    pairing_code: varchar({ length: 8 }).notNull().unique(),
    shelf_position_id: integer().references(() => shelfPosition.id, { onUpdate: 'cascade', onDelete: 'set null' }),
    nfc_tag: varchar().unique()
}, (table) => [
    primaryKey({ columns: [table.shelf_positions_device_id, table.slot_number] }),
]);
export const shelfPositionsDevicePairingsRelations = relations(shelfPositionsDevicePairing, ({ one }) => ({
    shelf_positions_device: one(shelfPositionsDevice, { fields: [shelfPositionsDevicePairing.shelf_positions_device_id], references: [shelfPositionsDevice.id] }),
    shelf_position: one(shelfPosition, { fields: [shelfPositionsDevicePairing.shelf_position_id], references: [shelfPosition.id] })
}));
export type TShelfPositionsDevicePairing = typeof shelfPositionsDevicePairing.$inferSelect;
export type TShelfPositionsDevicePairingInsert = typeof shelfPositionsDevicePairing.$inferInsert;