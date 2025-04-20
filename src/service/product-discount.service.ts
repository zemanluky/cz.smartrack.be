import {TPaginatedResult} from "../model/pagination.model";
import {productDiscount, TProduct, TProductDiscount} from "../db/schema/product";
import {TAuthenticatedUser} from "../plugin/auth.plugin";
import {
    TDiscountData, TListProductDiscountsQuery,
    TSaveDiscountData
} from "../model/product-discount.model";
import {
    countProductDiscountsByFilter,
    deleteProductDiscount, findDiscountsBetweenDates,
    findProductDiscountById, getProductDiscounts, insertProductDiscount,
    TProductDiscountWithProduct,
    updateProductDiscount
} from "../repository/product-discount.repository";
import {NotFound} from "../error/not-found.error";
import {getOrganizationByUserId} from "../repository/organization.repository";
import {Unauthenticated} from "../error/unauthenticated.error";
import {Unauthorized} from "../error/unauthorized.error";
import * as R from 'remeda';
import {isSameDay} from "date-fns";
import {BadRequest} from "../error/bad-request.error";
import {getProductById} from "./product.service";
import {and, eq, gte, isNull, lte, SQL} from "drizzle-orm";

type TProductDiscountIdPair = { product_id: number, discount_id: number };

/**
 * Lists product discounts for a given product.
 * @param productId
 * @param filters
 * @param user
 */
export async function listProductDiscounts(productId: number, filters: TListProductDiscountsQuery, user: TAuthenticatedUser): Promise<TPaginatedResult<TProductDiscount>> {
    // first try to find the product and verify that the user does have access to it
    const product = await getProductById(productId, user);
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;
    const sqlFilters: Array<SQL> = [];

    if (filters.active !== undefined) sqlFilters.push(eq(productDiscount.active, filters.active));
    if (filters.price_min !== undefined) sqlFilters.push(gte(productDiscount.new_price, filters.price_min));
    if (filters.price_max !== undefined) sqlFilters.push(lte(productDiscount.new_price, filters.price_max));
    if (filters.discount_percent_min !== undefined) sqlFilters.push(gte(productDiscount.discount_percent, filters.discount_percent_min));
    if (filters.discount_percent_max !== undefined) sqlFilters.push(lte(productDiscount.discount_percent, filters.discount_percent_max));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await getProductDiscounts(
        product.id, filters.limit, offset, sqlFilter, [filters.sort ?? 'asc', filters.sort_by ?? 'valid_from']
    );

    const filteredResultsCount = await countProductDiscountsByFilter(product.id, sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countProductDiscountsByFilter(product.id),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

/**
 * Retrieves a given product discount for a given product.
 * @param id ID of the discount to retrieve.
 * @param user
 */
export async function getProductDiscount({ product_id, discount_id }: TProductDiscountIdPair, user: TAuthenticatedUser): Promise<TProductDiscountWithProduct> {
    const productDiscount = await findProductDiscountById(discount_id);

    // verify the product discount exists and that it belongs to the specified product
    if (!productDiscount || productDiscount.product_id !== product_id)
        throw new NotFound('The requested discount does not exist', 'product_discount');

    // when the user is a system admin, they may retrieve any product discount
    if (user.role === 'sys_admin') return productDiscount;

    const usersOrganization = await getOrganizationByUserId(user.id);

    if (!usersOrganization)
        throw new Unauthenticated('Invalid authentication credentials.', 'invalid_credentials');

    if (usersOrganization.organization === null)
        throw new Error('Invalid user without an organization assigned.');

    if (productDiscount.product.organization_id !== usersOrganization.organization.id)
        throw new Unauthorized('You do not have access to this resource.', 'product_discount:read');

    return productDiscount;
}

type TDiscountPricingData = Pick<TProductDiscount, 'new_price'|'discount_percent'>;

/**
 * Verifies that there are no conflicting discount promos during a given timeframe.
 * @returns `true` when there are conflicting promos, `false` when there are none.
 */
async function verifyExistingDiscountPromos(from: Date, to: Date, productId: number): Promise<boolean> {
    const existingDiscounts = await findDiscountsBetweenDates([from, to], productId);
    return existingDiscounts.length !== 0;
}

/**
 * Prepares pricing data to be saved from received data from API.
 * It either calculates the discount percentage, or it calculates the new price from provided discount percentage.
 * @param data
 * @param product
 */
function getPricingData(data: TDiscountData|TSaveDiscountData, product: TProduct): TDiscountPricingData {
    let pricing: TDiscountPricingData;

    // if we got the exact price to update to, update the price directly, otherwise we will calculate the price from the discount
    if (data.new_price !== undefined) {
        pricing = {
            new_price: data.new_price,
            discount_percent: Math.round((1 - (data.new_price / product.price)) * 100)
        }
    }
    else if (data.discount_percent !== undefined) {
        pricing = {
            discount_percent: data.discount_percent,
            new_price: product.price * ((1 - data.discount_percent) * 100)
        }
    }
    else {
        throw new Error('Cannot change the price and discount properties without providing at least one of these properties.');
    }

    return pricing;
}

/**
 * Creates new product discount.
 * @param data The data to create the discount with.
 * @param user The current user creating the discount.
 */
export async function createProductDiscount(data: TSaveDiscountData, user: TAuthenticatedUser): Promise<TProductDiscountWithProduct> {
    // first try to find the product and verify that the user does have access to it
    const product = await getProductById(data.product_id, user);

    if (await verifyExistingDiscountPromos(data.valid_from, data.valid_until, product.id))
        throw new BadRequest('Cannot create new discount promo, since the dates of this promo would get in conflict with other discounts.');

    const pricingDetails = getPricingData(data, product);
    const createdDiscount = await insertProductDiscount(R.merge(
        pricingDetails,
        R.pick(data, ['active','valid_from','valid_until','product_id'])
    ));

    return { product, ...createdDiscount };
}

/**
 * Updates existing product discount.
 * @param data The data to update the discount properties with.
 * @param user The current user updating the discount.
 * @param idPair ID of the updated discount. Providing null creates new discount.
 */
export async function changeProductDiscount(data: TDiscountData, user: TAuthenticatedUser, idPair: TProductDiscountIdPair): Promise<TProductDiscountWithProduct> {
    const { product, ...productDiscount} = await getProductDiscount(idPair, user);

    // verify that the dates did not change, or else we have to verify that there's not a conflict with another discount
    if (
        (!isSameDay(productDiscount.valid_from, data.valid_from) || !isSameDay(productDiscount.valid_until, data.valid_until))
        && (await verifyExistingDiscountPromos(data.valid_from, data.valid_until, product.id))
    ) {
        throw new BadRequest('Cannot change the dates of a discount, since this would get in conflict with other discounts.');
    }

    const pricingUpdate = getPricingData(data, product);
    const updatedDiscount = await updateProductDiscount(
        R.merge(pricingUpdate, R.pick(data, ['active','valid_from','valid_until'])),
        productDiscount.id
    );

    return { ...updatedDiscount, product };
}

/**
 * Enables or disables a given product discount.
 * @param id ID of the enabled or disabled discount.
 * @param enable Whether the discount should be enabled (true) or disabled (false). When null, the current state is switched.
 * @param user The user toggling the discount.
 */
export async function toggleProductDiscount(id: TProductDiscountIdPair, user: TAuthenticatedUser, enable: boolean|null = null): Promise<TProductDiscount> {
    const productDiscount = await getProductDiscount(id, user);
    const defaultActive = !productDiscount.active;
    return await updateProductDiscount({ active: enable ?? defaultActive }, productDiscount.id);
}

/**
 * Permanently deletes a given product discount.
 * @param ids ID of the discount to be deleted.
 * @param user The user deleting the discount.
 */
export async function removeProductDiscount(ids: TProductDiscountIdPair, user: TAuthenticatedUser): Promise<void> {
    const productDiscount = await getProductDiscount(ids, user);
    return await deleteProductDiscount(productDiscount.id);
}