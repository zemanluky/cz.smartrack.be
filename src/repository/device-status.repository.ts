import { db } from "../db/db";
import {shelfDeviceStatusLog, TShelfDeviceStatusLog, TShelfDeviceStatusLogInsert} from "../db/schema/device";
import {and, count, eq, SQL} from "drizzle-orm";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";

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
    const deviceFilter = eq(shelfDeviceStatusLog.shelf_device_id, deviceId);

    return await db.query.shelfDeviceStatusLog.findMany({
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
    const deviceFilter = eq(shelfDeviceStatusLog.shelf_device_id, deviceId);

    const result = await db.select({ count: count() })
        .from(shelfDeviceStatusLog)
        .where(filters ? and(deviceFilter, filters) : deviceFilter)
    ;
    return result[0].count;
}

/**
 * Inserts new entry to a device's status log.
 * @param data
 */
export async function insertDeviceStatus(data: TShelfDeviceStatusLogInsert): Promise<void> {
    await db.insert(shelfDeviceStatusLog).values(data);
}