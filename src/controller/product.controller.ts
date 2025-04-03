import Elysia, {t} from "elysia";

export const productController = new Elysia({ prefix: '/product' })
    .get('/', 'List products for the current organization')
    .post('/', 'Create new product')
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .get('/:id', 'Get product by id')
    .put('/:id', 'Update product by id')
    .delete('/:id', 'Soft delete product by id')
;