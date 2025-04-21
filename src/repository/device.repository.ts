import {
    shelfDevice,
    shelfDeviceStatusLog,
    TShelfDevice,
    TShelfDeviceInsert,
    TShelfDeviceStatusLog
} from "../db/schema/device";
import {db} from "../db/db";
import {count, desc, eq, SQL} from "drizzle-orm";
import {TShelf} from "../db/schema/shelf";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";

export type TShelfDeviceWithShelf = TShelfDevice & {
    shelf: TShelf | null
}

export type TShelfDeviceWithDetail = TShelfDeviceWithShelf & {
    shelf_device_status_logs: Array<Pick<TShelfDeviceStatusLog, 'battery_percent'|'timestamp'>>,
};

/**
 * Retrieves a list of product discounts for a given product.
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function findShelfDevices(
    limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TShelfDeviceWithShelf>> {
    return await db.query.shelfDevice.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        where: (filters ? filters : undefined),
        limit, offset,
        with: {
            shelf: true
        }
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countShelfDevicesByFilter(filters: SQL|null = null): Promise<number> {
    const result = await db.select({ count: count() })
        .from(shelfDevice)
        .where(filters ? filters : undefined)
    ;
    return result[0].count;
}

/**
 * Tries to find one shelf device by its serial number.
 * @param serialNumber The serial number to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findDeviceBySerial(serialNumber: string): Promise<TShelfDevice|null> {
    const device = await db.query.shelfDevice.findFirst({
        where: eq(shelfDevice.serial_number, serialNumber)
    });
    return device ?? null;
}

/**
 * Tries to find one shelf device by its ID.
 * @param id The id to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findDeviceById(id: number): Promise<TShelfDeviceWithDetail|null> {
    const device = await db.query.shelfDevice.findFirst({
        where: eq(shelfDevice.id, id),
        with: {
            shelf_device_status_logs: {
                columns: {
                    battery_percent: true,
                    timestamp: true
                },
                limit: 30,
                orderBy: [desc(shelfDeviceStatusLog.timestamp)]
            },
            shelf: true
        }
    });
    return device ?? null;
}

/**
 * Inserts new device into database.
 * @param data
 */
export async function insertDevice(data: TShelfDeviceInsert): Promise<TShelfDeviceWithDetail> {
    const device = await db.insert(shelfDevice).values(data).returning();

    if (!device.length) throw new Error('Failed to insert device.');

    return {
        ...device[0],
        shelf: null,
        shelf_device_status_logs: []
    }
}

/**
 * Updates properties of a given device.
 * @param id
 * @param data
 */
export async function updateDevice(id: number, data: Partial<Omit<TShelfDevice,'id'>>): Promise<TShelfDeviceWithDetail> {
    const device = await db.update(shelfDevice).set(data).returning();

    if (!device.length) throw new Error('The device to update does not exist.');

    const deviceWithLogs = await findDeviceById(device[0].id);
    return deviceWithLogs as TShelfDeviceWithDetail;
}

/**
 * Deletes one shelf device by its ID.
 * @param id
 */
export async function deleteDevice(id: number): Promise<boolean> {
    const result = await db.delete(shelfDevice).where(eq(shelfDevice.id, id)).returning();
    return result.length !== 0;
}