import {
    gatewayDevice,
    shelfPositionsDevice,
    shelfPositionsDeviceLogs,
    shelfPositionsDevicePairing,
    TGatewayDevice,
    TShelfDeviceStatusLog,
    TShelfPositionsDevice,
    TShelfPositionsDeviceInsert,
    TShelfPositionsDevicePairing,
} from "../db/schema/device";
import {db} from "../db/db";
import {and, desc, eq, inArray} from "drizzle-orm";
import * as R from 'remeda';

export type TShelfDeviceWithPairings = TShelfPositionsDevice & {
    pairings: Array<TShelfPositionsDevicePairing>
}

export type TShelfDeviceWithDetail = TShelfDeviceWithPairings & {
    status_logs: Array<TShelfDeviceStatusLog>
    gateway_device: TGatewayDevice,
};

/**
 * Tries to find one shelf device by one of its pairing codes.
 * @param pairingCode The pairing code to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findShelfDeviceByPairingCode(pairingCode: string): Promise<TShelfDeviceWithDetail|null> {
    const existingDeviceId = await checkDeviceExistsByPairingCode(pairingCode);
    return existingDeviceId ? findShelfDeviceById(existingDeviceId) : null;
}

/**
 * Checks whether a shelf device exists by its pairing code.
 * @param pairingCode The pairing code to find the shelf device by.
 * @returns ID of existing device or null when does not exist.
 */
export async function checkDeviceExistsByPairingCode(pairingCode: string): Promise<number|null> {
    const result = await db.select({ id: shelfPositionsDevice.id })
        .from(shelfPositionsDevice)
        .leftJoin(shelfPositionsDevicePairing, eq(shelfPositionsDevicePairing.shelf_positions_device_id, shelfPositionsDevice.id))
        .where(eq(shelfPositionsDevicePairing.pairing_code, pairingCode))
        .limit(1)
    ;

    if (result.length === 0) return null;

    return result[0].id;
}

/**
 * Tries to find one shelf device by its serial number.
 * @param serialNumber The serial number to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findShelfDeviceBySerial(serialNumber: string): Promise<TShelfDeviceWithDetail|null> {
    const device = await db.query.shelfPositionsDevice.findFirst({
        where: eq(shelfPositionsDevice.serial_number, serialNumber),
        with: {
            gateway_device: true,
            status_logs: {
                limit: 25,
                orderBy: [desc(shelfPositionsDeviceLogs.timestamp)],
            },
            pairings: true
        }
    });
    return device ?? null;
}

/**
 * Tries to find one shelf device by its ID.
 * @param id The id to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findShelfDeviceById(id: number): Promise<TShelfDeviceWithDetail|null> {
    const device = await db.query.shelfPositionsDevice.findFirst({
        where: eq(shelfPositionsDevice.id, id),
        with: {
            gateway_device: true,
            status_logs: {
                limit: 25,
                orderBy: [desc(shelfPositionsDeviceLogs.timestamp)],
            },
            pairings: true
        }
    });
    return device ?? null;
}

/**
 * Retrieves shelf devices by gateway ID.
 * Does not check if the gateway actually exists.
 * @param gatewayId
 */
export async function findShelfDevicesByGateway(gatewayId: number): Promise<Array<TShelfDeviceWithPairings>> {
    return db.query.shelfPositionsDevice.findMany({
        where: eq(shelfPositionsDevice.gateway_device_id, gatewayId),
        with: {pairings: true}
    });
}

/**
 * Finds IDs of given shelf devices by their serial numbers. It also retrieves IDs for shelf devices which are managed
 * by given gateway.
 *
 * @param serialNumbers
 * @param gatewayId
 *
 * @returns Key-value pairs. The keys are the serial numbers, whereas the value is the found ID. When the device does not
 *          exist, the serial number is not included as a key in the resulting object.
 */
export async function findShelfDeviceIdsBySerialNumbers(serialNumbers: Array<string>, gatewayId: number): Promise<Record<string, number>> {
    const results = await db
        .select({ serial_number: shelfPositionsDevice.serial_number, id: shelfPositionsDevice.id })
        .from(shelfPositionsDevice)
        .where(and(
            eq(shelfPositionsDevice.gateway_device_id, gatewayId),
            inArray(shelfPositionsDevice.serial_number, serialNumbers)
        ))
    ;

    return R.pullObject(results, R.prop('serial_number'), R.prop('id'));
}

/**
 * Inserts new shelf device into database.
 * @param data
 */
export async function insertShelfDevice(data: TShelfPositionsDeviceInsert): Promise<TShelfPositionsDevice> {
    const device = await db.insert(shelfPositionsDevice).values(data).returning();

    if (!device.length) throw new Error('Failed to insert device.');

    return device[0];
}

/**
 * Updates properties of a given shelf device.
 * @param id
 * @param data
 */
export async function updateShelfDevice(id: number, data: Partial<Omit<TShelfPositionsDevice,'id'|'serial_number'>>): Promise<TShelfPositionsDevice> {
    const device = await db
        .update(shelfPositionsDevice)
        .set(data)
        .where(eq(shelfPositionsDevice.id, id))
        .returning()
    ;

    if (!device.length) throw new Error('The device to update does not exist.');

    return device[0];
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