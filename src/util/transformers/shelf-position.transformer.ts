import {TShelfPositionLogItem, TShelfPositionResponse} from "../../model/shelf-position.model";
import {TShelfPositionDetail, TShelfPositionLogWithProduct} from "../../repository/shelf-position.repository";
import {transformShelfPositionItem} from "./shelf.transformer";
import * as R from 'remeda';

/**
 * Transforms shelf position log entry.
 * @param data
 */
export function transformShelfPositionLog(data: TShelfPositionLogWithProduct): TShelfPositionLogItem {
    return {
        ...R.omit(data, ['product_id', 'shelf_position_id', 'product']),
        product: R.pick(data.product, ['id','name'])
    }
}

/**
 * Transform shelf position detail into response.
 * @param data
 */
export function transformShelfPositionDetail(data: TShelfPositionDetail): TShelfPositionResponse {
    return {
        ...transformShelfPositionItem(data),
        shelf: data.shelf,
        recent_logs: data.shelf_position_logs.map(spl => transformShelfPositionLog(spl))
    }
}