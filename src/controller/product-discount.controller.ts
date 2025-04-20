import Elysia, {t} from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    listProductDiscountsQuery,
    productDiscountData,
    productDiscountDetailResponse,
    productDiscountListResponse
} from "../model/product-discount.model";
import {
    changeProductDiscount,
    createProductDiscount,
    getProductDiscount,
    listProductDiscounts, removeProductDiscount, toggleProductDiscount
} from "../service/product-discount.service";
import {transformProductDiscount, transformProductDiscountDetail} from "../util/transformers/product.transformer";
import {paginatedResponse} from "../model/pagination.model";

export const productDiscountController = new Elysia({ prefix: '/product/:id/discount', tags: ['Product Discount'] })
    .use(authPlugin)
    .guard({
        params: t.Object({ id: t.Number() }),
        authUser: EAuthRequirement.Required
    })
    .get('/', async ({ params, query, user }) => {
        const { metadata, items } = await listProductDiscounts(params.id, query, user!);

        return {
            metadata,
            items: items.map(i => transformProductDiscount(i))
        }
    }, {
        detail: { description: 'Lists discounts of a given product.' },
        query: listProductDiscountsQuery,
        response: {
            200: paginatedResponse(productDiscountListResponse)
        }
    })
    .post('/', async ({ body, params, user, set }) => {
        const createdDiscount = await createProductDiscount(
            { ...body, product_id: params.id }, user!
        );

        set.status = 201;
        return transformProductDiscountDetail(createdDiscount, user!.role);
    }, {
        detail: { description: 'Creates a new discount for a given product.' },
        body: productDiscountData,
        response: {
            201: productDiscountDetailResponse
        }
    })
    .guard({
        params: t.Object({ id: t.Number(), discountId: t.Number() }),
    })
    .get('/:discountId', async ({ params, user }) => {
        const discount = await getProductDiscount(
            { discount_id: params.discountId, product_id: params.id }, user!
        );
        return transformProductDiscountDetail(discount, user!.role);
    }, {
        detail: { description: 'Gets details about a given discount.' },
        response: {
            200: productDiscountDetailResponse
        }
    })
    .put('/:discountId', async ({ body, user, params }) => {
        const updatedDiscount = await changeProductDiscount(
            body, user!, { product_id: params.id, discount_id: params.discountId }
        );
        return transformProductDiscountDetail(updatedDiscount, user!.role);
    }, {
        detail: {description: 'Updates existing discount parameters.' },
        body: productDiscountData,
        response: {
            200: productDiscountDetailResponse
        }
    })
    .patch('/:discountId/toggle', async ({ params, user }) => {
        const updatedDiscount = await toggleProductDiscount(
            { product_id: params.id, discount_id: params.discountId}, user!
        );
        return transformProductDiscount(updatedDiscount);
    }, {
        detail: { description: 'Enables or disables a given discount.' },
        response: {
            200: productDiscountListResponse
        }
    })
    .delete('/:discountId', async ({ params, user, set }) => {
        await removeProductDiscount({ product_id: params.id, discount_id: params.discountId}, user!);
        set.status = 204;
    }, {
        detail: { description: 'Deletes existing discount.' },
        response: {
            204: t.Undefined()
        }
    })
;