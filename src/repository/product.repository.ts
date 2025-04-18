import {product, TProduct, TProductInsert} from "../db/schema/product";
import {db} from "../db/db";
import {and, count, eq, SQL} from "drizzle-orm";
import {TProductData} from "../model/product.model";
import {NotFound} from "../error/not-found.error";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";

/**
 * Retrieves a list of products for a given organization.
 * @param organizationId
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function getProducts(
    organizationId: number, limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TProduct>> {
    const organizationFilter = eq(product.organization_id, organizationId);

    return await db.query.product.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        where: (filters ? and(organizationFilter, filters) : organizationFilter),
        limit, offset,
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countProductsByFilter(organizationId: number, filters: SQL|null = null): Promise<number> {
    const organizationFilter = eq(product.organization_id, organizationId);

    const result = await db.select({ count: count() })
        .from(product)
        .where(filters ? and(organizationFilter, filters) : organizationFilter)
    ;
    return result[0].count;
}

/**
 * Finds product by its ID.
 * @param productId
 * @returns The found product or null when not found.
 */
export async function findProductById(productId: number): Promise<TProduct|null> {
    const result = await db.query.product
        .findFirst({ where: eq(product.id, productId) });
    return result ?? null;
}

/**
 * Finds product by exact name and organization.
 * @param productName
 * @param organizationId
 */
export async function findProductByName(productName: string, organizationId: number): Promise<TProduct|null> {
    const result = await db.query.product
        .findFirst({
            where: and(
                eq(product.name, productName),
                eq(product.organization_id, organizationId)
            )
        });
    return result ?? null;
}

/**
 * Inserts new product to database.
 * This method expects that you have verified that there is not a product with the same name within the same organization.
 * @param data Data to insert.
 * @returns The newly created product.
 */
export async function insertProduct(data: TProductInsert): Promise<TProduct> {
    const result = await db.insert(product).values(data).returning();
    return result[0];
}

/**
 * Updates existing product.
 * If the updated product does not exist, an error is thrown.
 * @param data
 * @param id
 * @returns The updated product entity.
 */
export async function updateProduct(data: TProductData, id: number): Promise<TProduct> {
    const result = await db.update(product).set(data).where(eq(product.id, id)).returning();

    if (result.length === 0) throw new NotFound('Product to update was not found.', 'product');

    return result[0];
}

/**
 * Soft-deletes a given product by ID.
 * @param id ID of the product to soft-delete or restore.
 * @param isDelete When true, the product is soft-deleted, when false, the product is restored.
 */
export async function softDeleteProduct(id: number, isDelete: boolean = true): Promise<TProduct> {
    const result = await db.update(product)
        .set({ deleted_at: isDelete ? new Date() : null })
        .where(eq(product.id, id))
        .returning()
    ;

    if (result.length === 0) throw new NotFound(`Product to ${isDelete ? 'delete' : 'restore'} was not found.`, 'product');

    return result[0];
}