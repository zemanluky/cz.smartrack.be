import { db } from "../db/db";
import {shelfPositionsDeviceLogs, TShelfDeviceStatusLog, TShelfDeviceStatusLogInsert} from "../db/schema/device";
import {and, count, eq, SQL} from "drizzle-orm";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";
import {BunSQLTransaction} from "drizzle-orm/bun-sql";

/**
 * Retrieves a list of shelf device logs.
 * @param deviceId
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function findShelfDeviceLogs(
    deviceId: number, limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TShelfDeviceStatusLog>> {
    const deviceFilter = eq(shelfPositionsDeviceLogs.shelf_positions_device_id, deviceId);

    return db.query.shelfPositionsDeviceLogs.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        where: (filters ? and(deviceFilter, filters) : deviceFilter),
        limit, offset
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param deviceId
 * @param filters
 */
export async function countShelfDeviceLogsByFilter(deviceId: number, filters: SQL|null = null): Promise<number> {
    const deviceFilter = eq(shelfPositionsDeviceLogs.shelf_positions_device_id, deviceId);

    const result = await db.select({ count: count() })
        .from(shelfPositionsDeviceLogs)
        .where(filters ? and(deviceFilter, filters) : deviceFilter)
    ;
    return result[0].count;
}

/**
 * Inserts new entry to a device's status log.
 * @param data
 */
export async function insertDeviceStatus(data: TShelfDeviceStatusLogInsert): Promise<void> {
    await db.insert(shelfPositionsDeviceLogs).values(data);
}

/**
 * Inserts multiple log entries.
 * @param data
 * @param tx Possibly a running transaction.
 */
export async function insertBatchDeviceStatus(data: Array<TShelfDeviceStatusLogInsert>): Promise<void> {
    await db.insert(shelfPositionsDeviceLogs).values(data);
}