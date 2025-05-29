import { t } from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";
import {organizationResponse} from "./organization.model";
import {productResponse} from "./product.model";

export const listShelvesQuery = t.Composite([
    paginationWithSortingQuery(['id', 'shelf_name']),
    t.Partial(t.Object({
        organization_id: t.Number({ description: 'Filters shelves of a given organization. Available only to system admins.' }),
        shelf_name: t.String({ description: 'Filters shelves containing given search query in their name.' }),
        store_location: t.String({ description: 'Filters shelves containing given search query in their location description.' })
    }))
]);
export type TListShelvesQuery = typeof listShelvesQuery.static;

export const shelfData = t.Object({
    organization_id: t.Optional(t.Number({ minimum: 1, description: 'ID of the organization to which the shelf should be assigned to. Available only to system admins.' })),
    shelf_name: t.String({ minLength: 3, maxLength: 255, description: 'Arbitrary name of the shelf for easier identification.' }),
    shelf_store_location: t.Nullable(t.String({ minLength: 3, maxLength: 255, description: 'Description of the shelf and its location within the given store for navigation purposes.' }))
});
export type TShelfData = typeof shelfData.static;

export const shelfListItemResponse = t.Object({
    id: t.Number({ description: 'ID of the given shelf.' }),
    organization: t.Optional(organizationResponse),
    shelf_name: t.String({ description: 'Arbitrary name of the shelf.' }),
    shelf_store_location: t.Nullable(t.String({ description: 'Approximate location of the shelf within the store.' })),
    shelf_position_count: t.Number({ description: 'Number of positions this shelf has.' })
});
export type TShelfListItemResponse = typeof shelfListItemResponse.static;

export const shelfPositionItem = t.Object({
    id: t.Number({ description: 'ID of the given position in the shelf.' }),
    row: t.Number({ description: 'Row number of the position within the parent shelf.' }),
    column: t.Number({ description: 'Column number of the position within the parent shelf.' }),
    current_stock_percent: t.Nullable(t.Number({ minimum: 0, maximum: 100, description: 'Last reported percentage amount of product left.' })),
    estimated_product_amount: t.Nullable(t.Number({ minimum: 0, description: 'Approximated number of items left on this shelf position.' })),
    max_current_product_capacity: t.Nullable(t.Number({ minimum: 0, description: 'The set maximum amount of items left on this shelf position.' })),
    is_low_stock: t.Nullable(t.Boolean({ description: 'Whether the stock on this position is lower than the set threshold.' })),
    product: t.Nullable(t.Object({
        id: t.Number({ description: 'ID of the assigned product to the shelf.' }),
        name: t.String({ description: 'Name of the assigned product.' })
    }))
});

export const shelfDetailResponse = t.Composite([
    shelfListItemResponse,
    t.Object({
        shelf_positions: t.Array(shelfPositionItem)
    })
]);
export type TShelfDetailResponse = typeof shelfDetailResponse.static;