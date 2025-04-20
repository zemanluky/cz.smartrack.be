import {TProduct, TProductDiscount} from "../../db/schema/product";
import {TProductResponse} from "../../model/product.model";
import {TUser} from "../../db/schema/user";
import * as R from 'remeda';
import {TProductDiscountDetailResponse, TProductDiscountListResponse} from "../../model/product-discount.model";
import {TProductDiscountWithProduct} from "../../repository/product-discount.repository";
import {isFuture, isPast} from "date-fns";

/**
 * Transforms retrieved product from database into product for response.
 * @param product The product to transform.
 * @param role Role of the user getting the response.
 */
export function transformProduct(product: TProduct, role: TUser['role']): TProductResponse {
    return {
        ...R.pick(product, ['id', 'name', 'price']),
        ...(role === 'sys_admin' ? { organization_id: product.organization_id } : {}),
        is_deleted: product.deleted_at !== null
    }
}

/**
 * Transforms retrieved product discount for list of discounts response.
 * @param discount The discount to transform.
 */
export function transformProductDiscount(discount: TProductDiscount|TProductDiscountWithProduct): TProductDiscountListResponse {
    return {
        ...discount,
        currently_valid: isPast(discount.valid_from) && isFuture(discount.valid_until)
    }
}

/**
 * Transforms retrieved product discount for detailed product discount response.
 * @param discount The discount to transform.
 * @param role Role of the user getting the response.
 */
export function transformProductDiscountDetail(discount: TProductDiscountWithProduct, role: TUser['role']): TProductDiscountDetailResponse {
    return {
        ...transformProductDiscount(discount),
        product: transformProduct(discount.product, role)
    }
}