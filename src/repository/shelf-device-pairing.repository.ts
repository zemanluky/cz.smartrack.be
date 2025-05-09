import { db } from "../db/db";
import {
    shelfPositionsDevicePairing,
    TShelfPositionsDevicePairing,
    TShelfPositionsDevicePairingInsert
} from "../db/schema/device";
import {eq} from "drizzle-orm";

/**
 * Batch-inserts data about multiple pairing positions.
 * @param data
 */
export async function insertShelfDevicePairingPositions(data: Array<TShelfPositionsDevicePairingInsert>): Promise<Array<TShelfPositionsDevicePairing>> {
    const insertedPairingPositions = await db.insert(shelfPositionsDevicePairing)
        .values(data)
        .returning()
    ;

    if (insertedPairingPositions.length !== data.length)
        throw new Error('Failed to insert all pairing positions.');

    return insertedPairingPositions;
}

/**
 * Updates one shelf device pairing.
 * @param data
 * @param pairingCode
 */
export async function updateShelfDevicePairingByPairingCode(
    pairingCode: string,
    data: Partial<Omit<TShelfPositionsDevicePairing,'shelf_positions_device_id'|'slot_number'>>
): Promise<TShelfPositionsDevicePairing> {
    const updated = await db.update(shelfPositionsDevicePairing)
        .set(data)
        .where(eq(shelfPositionsDevicePairing.pairing_code, pairingCode))
        .returning()
    ;

    if (updated.length === 0)
        throw new Error('Expected the shelf pairing to update to exist.')

    return updated[0];
}
