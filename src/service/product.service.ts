import {TPaginatedResult, TPaginationMetadata} from "../model/pagination.model";
import {product, TProduct, TProductInsert} from "../db/schema/product";
import {TListProductQuery, TProductData} from "../model/product.model";
import {
    countProductsByFilter,
    findProductById,
    findProductByName, getProducts,
    insertProduct,
    softDeleteProduct,
    updateProduct
} from "../repository/product.repository";
import {NotFound} from "../error/not-found.error";
import {getOrganizationByUserId} from "../repository/organization.repository";
import {BadRequest} from "../error/bad-request.error";
import {TOrganization} from "../db/schema/organization";
import {Unauthorized} from "../error/unauthorized.error";
import {Unauthenticated} from "../error/unauthenticated.error";
import {and, gt, ilike, isNotNull, isNull, lt, SQL} from "drizzle-orm";
import {TAuthenticatedUser} from "../plugin/auth.plugin";

/**
 * Verifies that the user trying to create new product has an assigned organization and can create products.
 * @param userId
 * @returns The organization assigned to the given user. If the user is a sysadmin, null will be returned.
 */
async function verifyUsersOrganization(userId: number): Promise<TOrganization|null> {
    const { user, organization } = (await getOrganizationByUserId(userId)) ?? { user: null, organization: null };

    if (!user)
        throw new Unauthenticated('The currently logged-in user\'s profile could not be found.', 'invalid_credentials');

    if (!organization && user.role !== 'sys_admin')
        throw new BadRequest('Cannot manage products without an assigned organization.', 'product:manage:required-organization');

    return organization;
}

/**
 * Lists products for a given user (organization). Additional filters may be applied.
 * @param user
 * @param filters
 */
export async function listProducts(user: TAuthenticatedUser, filters: TListProductQuery): Promise<TPaginatedResult<TProduct>> {
    if (user.role === 'sys_admin' && filters.organization_id === null)
        throw new BadRequest('As a system admin you are required to provide the ID of the organization whose products you wanna retrieve.', 'missing_parameter');

    const organizationId = !filters.organization_id ? (await verifyUsersOrganization(user.id))!.id : filters.organization_id;
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;

    const sqlFilters: Array<SQL> = [];

    if (filters.name) sqlFilters.push(ilike(product.name, `%${filters.name}%`));
    if (filters.price_min !== undefined) sqlFilters.push(gt(product.price, filters.price_min));
    if (filters.price_max !== undefined) sqlFilters.push(lt(product.price, filters.price_max));
    if (filters.is_deleted !== undefined)
        sqlFilters.push(filters.is_deleted ? isNotNull(product.deleted_at) : isNull(product.deleted_at));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await getProducts(
        organizationId, filters.limit, offset, sqlFilter, [filters.sort ?? 'asc', filters.sort_by ?? 'name']
    );

    const filteredResultsCount = await countProductsByFilter(organizationId, sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countProductsByFilter(organizationId),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

/**
 * Gets product by its ID. It is checked that the user has access to the given product.
 * @param id
 * @param user
 * @throws {NotFound} When the product does not exist.
 * @throws {Unauthorized} When the user does not have access to the product.
 */
export async function getProductById(id: number, user: TAuthenticatedUser): Promise<TProduct> {
    const product = await findProductById(id);

    if (!product)
        throw new NotFound('Requested product could not be found.', 'product');

    // verify that the user may access the retrieved product
    if (
        user.role !== 'sys_admin'
        && product.organization_id !== ((await verifyUsersOrganization(user.id)) ?? {id: null}).id
    ) throw new Unauthorized(
        'The requested product does not belong to the user\'s own organization.',
        'product:out-of-organization'
    );

    return product;
}

/**
 * Saves new or updates existing product.
 * @param productData
 * @param user
 * @param id
 * @param organizationId
 */
export async function saveProduct(productData: TProductData, user: TAuthenticatedUser, id: number|null = null, organizationId: number|null = null): Promise<TProduct> {
    if (organizationId === null) {
        if (user.role === 'sys_admin')
            throw new Error('Organization ID must be provided when a sys admin is creating or updating a product for a given organization.');

        const organization = await verifyUsersOrganization(user.id);
        organizationId = organization!.id;
    }

    // verify that the name is not used
    const existingProductByName = await findProductByName(productData.name, organizationId);

    if (existingProductByName !== null && existingProductByName.id !== id)
        throw new BadRequest('Cannot create or update product with already used name.', 'product:manage:duplicate-name');

    // when we are updating data of a given product
    if (id !== null) {
        const existingProduct = await findProductById(id);

        if (!existingProduct) throw new NotFound('The product to update was not found.', 'product');

        return updateProduct(productData, existingProduct.id);
    }

    const insertData: TProductInsert = {
        ...productData,
        organization_id: organizationId
    }
    return insertProduct(insertData);
}

/**
 * Marks a given product as deleted.
 * @param id
 * @param user
 */
export async function deleteProduct(id: number, user: TAuthenticatedUser): Promise<TProduct> {
    const product = await getProductById(id, user);
    return softDeleteProduct(product.id);
}

/**
 * Restores a given product.
 * @param id
 * @param user
 */
export async function restoreProduct(id: number, user: TAuthenticatedUser): Promise<TProduct> {
    const product = await getProductById(id, user);
    return softDeleteProduct(product.id, false);
}