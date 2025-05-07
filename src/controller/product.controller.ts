import Elysia, {t} from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {deleteProduct, getProductById, listProducts, restoreProduct, saveProduct} from "../service/product.service";
import {listProductsQuery, productResponse, saveProductData} from "../model/product.model";
import {transformProduct} from "../util/transformers/product.transformer";
import {BadRequest} from "../error/bad-request.error";
import {paginatedResponse} from "../model/pagination.model";
import * as R from 'remeda';

export const productController = new Elysia({ prefix: '/product', tags: ['Product'] })
    .use(authPlugin)
    .guard({ authUser: EAuthRequirement.Required })
    .get('/', async ({ query, user }) => {
        const filteredQuery = user!.role !== 'sys_admin'
            ? R.omit(query, ['organization_id'])
            : query
        ;
        const paginatedResults = await listProducts(user!, filteredQuery);
        return {
            metadata: paginatedResults.metadata,
            items: paginatedResults.items.map(product => transformProduct(product, user!.role))
        }
    }, {
        detail: { description: 'Retrieves a list of products for the currently logged in user. Admins may retrieve products for a specified organization.' },
        query: listProductsQuery,
        response: {
            200: paginatedResponse(productResponse)
        }
    })
    .post('/', async ({ user, body }) => {
        if (user!.role === 'sys_admin' && body.organization_id === undefined)
            throw new BadRequest(
                'Cannot create a product as an system admin without specifying the organization to which the product should be assigned.',
                'product:create-sys-admin:missing-organization'
            );

        const createdProduct = await saveProduct(
            R.omit(body, ['organization_id']), user!, null, body.organization_id ?? null
        );

        return transformProduct(createdProduct, user!.role);
    }, {
        detail: { description: 'Creates new product with provided data.' },
        body: saveProductData,
        response: {
            200: productResponse
        }
    })
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .get('/:id', async ({ user, params }) => {
        const product = await getProductById(params.id, user!);
        return transformProduct(product, user!.role);
    }, {
        detail: { description: 'Retrieves a product by its ID.' },
        response: {
            200: productResponse
        }
    })
    .put('/:id', async ({ user, params, body }) => {
        const organizationId = user!.role === 'sys_admin'
            ? (await getProductById(params.id, user!)).organization_id
            : null
        ;
        const updatedProduct = await saveProduct(
            R.omit(body, ['organization_id']), user!, params.id, organizationId
        );
        return transformProduct(updatedProduct, user!.role);
    }, {
        detail: { description: 'Updates existing product with provided data.' },
        body: saveProductData,
        response: {
            200: productResponse
        },
    })
    .delete('/:id', async ({ params, user }) => {
        const product = await deleteProduct(params.id, user!);
        return transformProduct(product, user!.role);
    }, {
        detail: { description: 'Soft-deletes one existing product.' },
        response: {
            200: productResponse
        }
    })
    .patch('/:id/restore', async ({ params, user }) => {
        const product = await restoreProduct(params.id, user!);
        return transformProduct(product, user!.role);
    }, {
        detail: { description: 'Restores one soft-deleted product.' },
        response: {
            200: productResponse
        }
    })
;