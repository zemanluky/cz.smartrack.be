import {TProduct} from "../../db/schema/product";
import {TProductResponse} from "../../model/product.model";
import {TUser} from "../../db/schema/user";
import * as R from 'remeda';

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