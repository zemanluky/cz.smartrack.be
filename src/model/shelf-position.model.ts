import { t } from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";
import {shelfListItemResponse, shelfPositionItem} from "./shelf.model";

export const listShelfPositionLogsQuery = t.Composite([
    paginationWithSortingQuery(['id', 'timestamp']),
    t.Partial(t.Object({
        timestamp_min: t.Date({ description: 'Filters logs entries newer than filter value.' }),
        timestamp_max: t.Date({ description: 'Filters logs entries older than filter value.' }),
        product_id: t.Number({ description: 'Filters logs with the set product.' }),
   }))
]);
export type TListShelfPositionLogsQuery = typeof listShelfPositionLogsQuery.static;

export const shelfPositionData = t.Object({
    row: t.Number({ minimum: 1, description: 'Row number of the position within the parent shelf.' }),
    column: t.Number({ minimum: 1, description: 'Column number of the position within the parent shelf.' }),
    product_id: t.Nullable(t.Number({ default: null, description: 'ID of the product to assign to this shelf position.' })),
    low_stock_threshold_percent: t.Number({ default: 20, exclusiveMinimum: 0, exclusiveMaximum: 100, description: 'At which point this position should be marked as having low stock?'}),
    max_current_product_capacity: t.Nullable(t.Number({ minimum: 1, description: 'How many pieces of the product can fit at this position?' }))
});
export type TShelfPositionData = typeof shelfPositionData.static;

export const shelfPositionProductData = t.Omit(shelfPositionData, ['row', 'column']);
export type TShelfPositionProductData = typeof shelfPositionProductData.static;

export const shelfPositionLogItem = t.Object({
    id: t.Number(),
    timestamp: t.Date({ description: 'Time of log.' }),
    amount_percent: t.Number({ minimum: 0, maximum: 100, description: 'Percentage amount of the product remaining in the shelf at the time of the log.'}),
    product: t.Object({
        id: t.Number(),
        name: t.String()
    })
});
export type TShelfPositionLogItem = typeof shelfPositionLogItem.static;

export const shelfPositionResponse = t.Composite([
    shelfPositionItem,
    t.Object({
        shelf: t.Omit(shelfListItemResponse, ['shelf_position_count']),
        recent_logs: t.Array(shelfPositionLogItem)
    })
]);
export type TShelfPositionResponse = typeof shelfPositionResponse.static;
