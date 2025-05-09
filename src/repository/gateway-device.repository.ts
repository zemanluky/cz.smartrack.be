import {
    gatewayDevice, shelfPositionsDevice,
    TGatewayDevice,
    TGatewayDeviceInsert,
    TShelfPositionsDevice
} from "../db/schema/device";
import {db} from "../db/db";
import {count, desc, eq, getTableColumns, sql, SQL} from "drizzle-orm";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";

export type TGatewayDeviceWithNodeCount = TGatewayDevice & {
    number_of_nodes: number
}

export type TGatewayDeviceWithDetail = TGatewayDevice & {
    shelf_positions_devices: Array<TShelfPositionsDevice>,
};

/**
 * Retrieves a list of product discounts for a given product.
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function findGatewayDevices(
    limit: number = 25, offset: number = 0, sort: TSortConfig, filters: SQL|null = null
): Promise<Array<TGatewayDeviceWithNodeCount>> {
    return db.select({ ...getTableColumns(gatewayDevice), number_of_nodes: count(shelfPositionsDevice.id) })
        .from(gatewayDevice)
        .leftJoin(shelfPositionsDevice, eq(gatewayDevice.id, shelfPositionsDevice.gateway_device_id))
        .where(filters ?? undefined)
        .groupBy(gatewayDevice.id)
        .orderBy(...getQueryOrderByConfig(sort))
        .limit(limit)
        .offset(offset)
    ;
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countGatewayDevicesByFilter(filters: SQL|null = null): Promise<number> {
    const result = await db.select({ count: count() })
        .from(gatewayDevice)
        .where(filters ? filters : undefined)
    ;
    return result[0].count;
}

/**
 * Tries to find one shelf device by its serial number.
 * @param serialNumber The serial number to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findGatewayDeviceBySerial(serialNumber: string): Promise<TGatewayDeviceWithDetail|null> {
    const device = await db.query.gatewayDevice.findFirst({
        where: eq(gatewayDevice.serial_number, serialNumber),
        with: { shelf_positions_devices: true }
    });
    return device ?? null;
}

/**
 * Tries to find one shelf device by its ID.
 * @param id The id to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findGatewayDeviceById(id: number): Promise<TGatewayDeviceWithDetail|null> {
    const device = await db.query.gatewayDevice.findFirst({
        where: eq(gatewayDevice.id, id),
        with: { shelf_positions_devices: true }
    });
    return device ?? null;
}

/**
 * Inserts new device into database.
 * @param data
 */
export async function insertGatewayDevice(data: TGatewayDeviceInsert): Promise<TGatewayDeviceWithDetail> {
    const device = await db.insert(gatewayDevice).values(data).returning();

    if (!device.length) throw new Error('Failed to insert device.');

    return {
        ...device[0],
        shelf_positions_devices: []
    }
}

/**
 * Updates properties of a given device.
 * @param id
 * @param data
 */
export async function updateGatewayDevice(id: number, data: Partial<Omit<TGatewayDevice,'id'>>): Promise<TGatewayDeviceWithDetail> {
    const device = await db
        .update(gatewayDevice)
        .set(data)
        .where(eq(gatewayDevice.id, id))
        .returning()
    ;

    if (!device.length) throw new Error('The device to update does not exist.');

    const deviceWithNodes = await findGatewayDeviceById(device[0].id);
    return deviceWithNodes as TGatewayDeviceWithDetail;
}

/**
 * Deletes one shelf device by its ID.
 * @param id
 */
export async function deleteGatewayDevice(id: number): Promise<boolean> {
    const result = await db
        .delete(gatewayDevice)
        .where(eq(gatewayDevice.id, id))
        .returning()
    ;
    return result.length !== 0;
}