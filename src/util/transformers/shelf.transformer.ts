import {
    TShelfPositionWithProduct,
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
 * Transform one shelf position with product information.
 * @param item
 */
export function transformShelfPositionItem(item: TShelfPositionWithProduct): TShelfDetailResponse['shelf_positions'][0] {
    const baseData = R.omit(item, ['shelf_id','product_id','product','low_stock_threshold_percent']);

    if (item.product_id === null) {
        return {
            ...baseData,
            product: null,
            is_low_stock: null,
            estimated_product_amount: null,
        }
    }

    const isLowStock = item.current_stock_percent !== null
        ? item.current_stock_percent <= item.low_stock_threshold_percent
        : null
    ;
    const estimatedProductAmount = item.max_current_product_capacity !== null && item.current_stock_percent !== null
        ? Math.floor((item.current_stock_percent / 100) * item.max_current_product_capacity)
        : null
    ;

    return {
        ...baseData,
        is_low_stock: isLowStock,
        product: {
            id: item.product_id,
            name: item.product!.name
        },
        estimated_product_amount: estimatedProductAmount
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
        shelf_positions: shelf.shelf_positions.map(sp => transformShelfPositionItem(sp))
    }
}