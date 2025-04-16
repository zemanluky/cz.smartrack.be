import Elysia, {t} from "elysia";

export const productDiscountController = new Elysia({ prefix: '/product/:id/discount', tags: ['Product Discount'] })
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .get('/', 'List discounts of a given product')
    .post('/', 'Create discount for a given product')
    .guard({
        params: t.Object({ id: t.Number(), discountId: t.Number() }),
    })
    .put('/:id', 'Update discount for a given product')
    .patch('/:id/toggle', 'Toggle discount for a given product')
    .delete('/:id', 'Delete discount for a given product')
;