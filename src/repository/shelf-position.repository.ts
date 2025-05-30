import {shelfPosition, TShelf, TShelfPosition, TShelfPositionInsert, TShelfPositionLogEntry} from "../db/schema/shelf";
import {db} from "../db/db";
import {and, eq} from "drizzle-orm";
import {shelfPositionsDevicePairing, TShelfPositionsDevicePairing} from "../db/schema/device";
import {TProduct} from "../db/schema/product";

export type TShelfPositionLogWithProduct = TShelfPositionLogEntry & { product: TProduct };
export type TShelfPositionDetail = TShelfPosition & {
    shelf: TShelf,
    shelf_position_logs: Array<TShelfPositionLogWithProduct>,
    product: TProduct|null,
    pairing: TShelfPositionsDevicePairing|null
}

/**
 * Finds a shelf position by its ID.§
 * @param id The ID to find the shelf position by.
 * @returns The found shelf position, or null when not found.
 */
export async function findShelfPositionById(id: number): Promise<TShelfPositionDetail|null> {
    const result = await db.query.shelfPosition.findFirst({
        where: eq(shelfPosition.id, id),
        with: {
            product: true,
            shelf: true,
            shelf_position_logs: {
                orderBy: (logs, { desc }) => [desc(logs.timestamp)],
                limit: 25,
                with: {
                    product: true
                }
            },
            pairing: true
        }
    });
    return result ?? null;
}

/**
 * Finds a shelf position by the NFC tag value.
 * @param nfcTag The NFC tag to find the shelf position by.
 * @returns The found shelf position, or null when not found (or when the NFC tag related to the device is not assigned to any shelf position yet.)
 */
export async function findShelfPositionByNfcTag(nfcTag: string): Promise<TShelfPositionDetail|null> {
    const id = await findShelfPositionIdByNfcTag(nfcTag);
    return id !== null ? findShelfPositionById(id) : null;
}

/**
 * Finds ID of a shelf position based on provided NFC tag.
 * When the tag is not assigned to any slot, or when the slot does not have any shelf position assigned, null is returned.
 * @param nfcTag The NFC tag to retrieve the ID by.
 */
export async function findShelfPositionIdByNfcTag(nfcTag: string): Promise<number|null> {
    const result = await db.select({ id: shelfPosition.id })
        .from(shelfPositionsDevicePairing)
        .leftJoin(shelfPosition, eq(shelfPositionsDevicePairing.shelf_position_id, shelfPosition.id))
        .where(eq(shelfPositionsDevicePairing.nfc_tag, nfcTag))
    ;

    if (result.length === 0) return null;

    return result[0].id;
}

/**
 * Checks whether a shelf position exists by the parent shelf, and the row/column placement within that shelf.
 * @param shelfId The parent shelf ID.
 * @param row Row in the shelf where the device is mounted.
 * @param column Column in the shelf where the device is mounted.
 * @returns ID when the shelf position with given parameters exists. Otherwise, null is returned.
 */
export async function existsShelfPositionByShelfRowColumn(shelfId: number, row: number, column: number): Promise<number|null> {
    const result = await db.select({ id: shelfPosition.id })
        .from(shelfPosition)
        .where(and(
            eq(shelfPosition.shelf_id, shelfId),
            eq(shelfPosition.column, column),
            eq(shelfPosition.row, row),
        ))
    ;

    return result.length !== 0 ? result[0].id : null;
}

/**
 * Inserts new shelf position.
 * Expects that unique constraints have been checked before calling this method.
 * @param data The data to create the shelf position with.
 */
export async function insertShelfPosition(data: TShelfPositionInsert): Promise<TShelfPosition> {
    const result = await db.insert(shelfPosition).values(data).returning();

    if (result.length === 0) throw new Error('Failed to insert new shelf position data.');

    return result[0];
}

/**
 * Updates existing shelf position with given data.
 * Expects that unique constraints have been checked before calling this method.
 * @param data The data to update the shelf position with.
 * @param id ID of the shelf position to update.
 */
export async function updateShelfPosition(data: Partial<Omit<TShelfPosition,'id'|'shelf_id'>>, id: number): Promise<TShelfPosition> {
    const result = await db.update(shelfPosition)
        .set(data)
        .where(eq(shelfPosition.id, id))
        .returning()
    ;

    if (result.length === 0) throw new Error('The shelf position expected to be updated does not exist. Please, check existence before updating.');

    return result[0];
}

/**
 * Deletes shelf position by its ID.
 * @param id ID of the shelf to delete.
 */
export async function deleteShelfPosition(id: number): Promise<void> {
    await db.delete(shelfPosition).where(eq(shelfPosition.id, id));
}