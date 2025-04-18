import {t} from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";

export const listProductsQuery = t.Composite([
    paginationWithSortingQuery([]),
    t.Partial(t.Object({
        name: t.String(),
        price_min: t.Number(),
        price_max: t.Number(),
        is_deleted: t.Boolean(),
        organization_id: t.Number()
    }))
]);
export type TListProductQuery = typeof listProductsQuery.static;

export const saveProductData = t.Object({
    name: t.String({ min: 3, max: 255 }),
    price: t.Number({ min: 0 }),
    organization_id: t.Optional(t.Number())
});
export type TProductData = typeof saveProductData.static;

export const productResponse = t.Object({
    id: t.Number(),
    name: t.String(),
    price: t.Number(),
    is_deleted: t.Boolean(),
    organization_id: t.Optional(t.Number())
});
export type TProductResponse = typeof productResponse.static;