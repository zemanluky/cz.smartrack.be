import {t} from "elysia";
import {getUnixTime, startOfToday} from "date-fns";
import {paginationWithSortingQuery} from "./pagination.model";
import {productResponse} from "./product.model";

export const listProductDiscountsQuery = t.Composite([
    paginationWithSortingQuery(['new_price', 'discount_percent', 'valid_from', 'valid_until']),
    t.Partial(t.Object({
        price_min: t.Number(),
        price_max: t.Number(),
        discount_percent_min: t.Number(),
        discount_percent_max: t.Number(),
        valid_between_min: t.Date(),
        valid_between_max: t.Date(),
        active: t.Boolean()
    }))
]);
export type TListProductDiscountsQuery = typeof listProductDiscountsQuery.static;

export const productDiscountData = t.Object({
    new_price: t.Optional(t.Number({ min: 0 })),
    discount_percent: t.Optional(t.Number({ min: 1, max: 100 })),
    valid_from: t.Date({ minimumTimestamp: getUnixTime(startOfToday()) }),
    valid_until: t.Date({ minimumTimestamp: getUnixTime(startOfToday()) }),
    active: t.Boolean({ default: true })
});
export type TDiscountData = typeof productDiscountData.static;
export type TSaveDiscountData = TDiscountData & { product_id: number };

export const productDiscountListResponse = t.Object({
    id: t.Number(),
    product_id: t.Number(),
    new_price: t.Number(),
    discount_percent: t.Number(),
    valid_from: t.Date(),
    valid_until: t.Date(),
    active: t.Boolean(),
    currently_valid: t.Boolean()
});
export type TProductDiscountListResponse = typeof productDiscountListResponse.static;

export const productDiscountDetailResponse = t.Composite([
    productDiscountListResponse,
    t.Object({
        product: productResponse
    })
]);
export type TProductDiscountDetailResponse = typeof productDiscountDetailResponse.static;