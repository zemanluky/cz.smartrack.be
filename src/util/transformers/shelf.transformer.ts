import {
    TShelfWithDetailedPositionsOrganizations,
    TShelfWithPositionsOrganizations
} from "../../repository/shelf.repository";
import {TShelfDetailResponse, TShelfListItemResponse} from "../../model/shelf.model";
import * as R from "remeda";
import {TAuthenticatedUser} from "../../plugin/auth.plugin";

/**
 * Transforms shelf item into response.
 * @param shelf
 * @param user
 */
export function transformShelf(shelf: TShelfWithPositionsOrganizations, user: TAuthenticatedUser): TShelfListItemResponse {
    if (user.role === 'sys_admin')
        return {
            ...R.omit(shelf, ['shelf_positions', 'organization_id']),
            shelf_position_count: shelf.shelf_positions.length
        }

    return {
        ...R.omit(shelf, ['shelf_positions', 'organization', 'organization_id']),
        shelf_position_count: shelf.shelf_positions.length
    }
}

/**
 * Transforms shelf detail into detail response.
 * @param shelf
 * @param user
 */
export function transformShelfDetail(shelf: TShelfWithDetailedPositionsOrganizations, user: TAuthenticatedUser): TShelfDetailResponse {
    return {
        ...transformShelf(shelf, user),
        shelf_positions: shelf.shelf_positions.map((sp): TShelfDetailResponse['shelf_positions'][0] => {
            const baseData = R.omit(sp, ['shelf_id','product_id','product','low_stock_threshold_percent']);

            if (sp.product_id === null) {
                return {
                    ...baseData,
                    product: null,
                    is_low_stock: null,
                    estimated_product_amount: null,
                }
            }

            const isLowStock = sp.current_stock_percent !== null
                ? sp.current_stock_percent <= sp.low_stock_threshold_percent
                : null
            ;
            const estimatedProductAmount = sp.max_current_product_capacity !== null && sp.current_stock_percent !== null
                ? Math.floor((sp.current_stock_percent / 100) * sp.max_current_product_capacity)
                : null
            ;

            return {
                ...baseData,
                is_low_stock: isLowStock,
                product: {
                    id: sp.product_id,
                    name: sp.product!.name
                },
                estimated_product_amount: estimatedProductAmount
            }
        })
    }
}