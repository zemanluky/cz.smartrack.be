import {product, TProduct, TProductInsert} from "../db/schema/product";
import {db} from "../db/db";
import {and, count, eq, SQL} from "drizzle-orm";
import {TProductData} from "../model/product.model";
import {NotFound} from "../error/not-found.error";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";
import {shelf, TShelf, TShelfInsert, TShelfPosition} from "../db/schema/shelf";
import {TOrganization} from "../db/schema/organization";

export type TShelfPositionWithProduct = TShelfPosition & { product: TProduct|null };
export type TShelfWithPositionsOrganizations = TShelf & {
    shelf_positions: Array<TShelfPosition>,
    organization: TOrganization
}
export type TShelfWithDetailedPositionsOrganizations = TShelf & {
    shelf_positions: Array<TShelfPositionWithProduct>,
    organization: TOrganization
}

/**
 * Retrieves a filtered list of shelves.
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function findShelves(
    limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TShelfWithPositionsOrganizations>> {
    return await db.query.shelf.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        where: filters ?? undefined,
        limit, offset,
        with: { shelf_positions: true, organization: true }
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countShelvesByFilter(filters: SQL|null = null): Promise<number> {
    const result = await db.select({ count: count() })
        .from(shelf)
        .where(filters ?? undefined)
    ;
    return result[0].count;
}

/**
 * Finds shelf by its ID.
 * @param shelfId
 * @returns The found shelf or null when not found.
 */
export async function findShelfById(shelfId: number): Promise<TShelfWithDetailedPositionsOrganizations|null> {
    const result = await db.query.shelf.findFirst({
        where: eq(shelf.id, shelfId),
        with: {
            shelf_positions: {
                with: {
                    product: true
                }
            },
            organization: true
        }
    });
    return result ?? null;
}

/**
 * Inserts new shelf to database.
 * @param data Data to insert.
 * @returns The newly created shelf.
 */
export async function insertShelf(data: TShelfInsert): Promise<TShelf> {
    const result = await db.insert(shelf).values(data).returning();
    return result[0];
}

/**
 * Updates existing shelf.
 * If the updated shelf does not exist, an error is thrown.
 * @param data
 * @param id
 * @returns The updated shelf entity.
 */
export async function updateShelf(data: Partial<Omit<TShelf, 'id'>>, id: number): Promise<TShelf> {
    const result = await db.update(shelf).set(data).where(eq(shelf.id, id)).returning();

    if (result.length === 0) throw new Error('Shelf to be updated was not found. Please, check its existence before calling update.');

    return result[0];
}

/**
 * Deletes a given shelf by ID.
 * @param id ID of the shelf to delete.
 */
export async function deleteShelf(id: number): Promise<void> {
    await db.delete(shelf).where(eq(shelf.id, id));
}