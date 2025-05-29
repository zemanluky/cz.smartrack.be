import {product, productDiscount, TProduct, TProductDiscount, TProductDiscountInsert} from "../db/schema/product";
import {db} from "../db/db";
import {and, between, count, eq, SQL} from "drizzle-orm";
import {NotFound} from "../error/not-found.error";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";
import {TDiscountData} from "../model/product-discount.model";

/**
 * Retrieves a list of product discounts for a given product.
 * @param productId
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function getProductDiscounts(
    productId: number, limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TProductDiscount>> {
    const productFilter = eq(productDiscount.product_id, productId);

    return await db.query.productDiscount.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        where: (filters ? and(productFilter, filters) : productFilter),
        limit, offset,
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param productId
 * @param filters
 */
export async function countProductDiscountsByFilter(productId: number, filters: SQL|null = null): Promise<number> {
    const productFilter = eq(productDiscount.product_id, productId);

    const result = await db.select({ count: count() })
        .from(product)
        .where(filters ? and(productFilter, filters) : productFilter)
    ;
    return result[0].count;
}

export type TProductDiscountWithProduct = TProductDiscount & { product: TProduct };

/**
 * Finds product by its ID.
 * @param productDiscountId
 * @returns The found product discount with product or null when not found.
 */
export async function findProductDiscountById(productDiscountId: number): Promise<TProductDiscountWithProduct|null> {
    const result = await db.query.productDiscount.findFirst({
        where: eq(productDiscount.id, productDiscountId),
        with: { product: true }
    });
    return result ?? null;
}

/**
 * Finds product discount between given dates for a given product.
 * @param from Searches for discount of the given product from the given date (inclusive).
 * @param to Searches for discounts of the given product up to the given date (inclusive).
 * @param productId ID of the product.
 */
export async function findDiscountsBetweenDates([from, to]: [Date, Date], productId: number): Promise<Array<TProductDiscount>> {
    return await db.query.productDiscount
        .findMany({
            where: and(
                between(productDiscount.valid_from, from, to),
                between(productDiscount.valid_until, from, to),
                eq(productDiscount.product_id, productId)
            )
        });
}

/**
 * Inserts new product to database.
 * This method expects that you have verified that there is not a product with the same name within the same organization.
 * @param data Data to insert.
 * @returns The newly created product.
 */
export async function insertProductDiscount(data: TProductDiscountInsert): Promise<TProductDiscount> {
    const result = await db.insert(productDiscount).values(data).returning();
    return result[0];
}

/**
 * Updates existing product.
 * If the updated product does not exist, an error is thrown.
 * @param data
 * @param id
 * @returns The updated product entity.
 */
export async function updateProductDiscount(data: Partial<TDiscountData>, id: number): Promise<TProductDiscount> {
    const result = await db.update(productDiscount)
        .set(data)
        .where(eq(productDiscount.id, id))
        .returning()
    ;

    if (result.length === 0) throw new NotFound('Product discount to update was not found.', 'product_discount');

    return result[0];
}

/**
 * Deletes a given product discount by ID.
 * @param id ID of the product discount to delete.
 */
export async function deleteProductDiscount(id: number): Promise<void> {
    const result = await db.delete(productDiscount)
        .where(eq(productDiscount.id, id))
        .returning()
    ;

    if (result.length === 0) throw new NotFound(`Product to delete was not found.`, 'product_discount');
}