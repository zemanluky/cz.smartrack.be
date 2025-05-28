import {TAuthenticatedUser} from "../plugin/auth.plugin";
import {TPaginatedResult} from "../model/pagination.model";
import {BadRequest} from "../error/bad-request.error";
import {and, ilike, SQL} from "drizzle-orm";
import {NotFound} from "../error/not-found.error";
import {Unauthorized} from "../error/unauthorized.error";
import {TListShelvesQuery, TShelfData} from "../model/shelf.model";
import {shelf} from "../db/schema/shelf";
import {
    countShelvesByFilter,
    deleteShelf,
    findShelfById,
    findShelves, insertShelf, TShelfWithDetailedPositionsOrganizations,
    TShelfWithPositionsOrganizations, updateShelf
} from "../repository/shelf.repository";
import * as R from 'remeda';
import {getOrganizationByUserId} from "../repository/organization.repository";
import {TOrganization} from "../db/schema/organization";
import {Unauthenticated} from "../error/unauthenticated.error";

/**
 * Verifies that the user trying to create new or update an existing shelf has an assigned organization and can manage shelves.
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
 * Lists shelves. Additional filters may be applied.
 * @param user
 * @param filters
 */
export async function listShelves(user: TAuthenticatedUser, filters: TListShelvesQuery): Promise<TPaginatedResult<TShelfWithPositionsOrganizations>> {
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;

    const sqlFilters: Array<SQL> = [];

    if (filters.shelf_name) sqlFilters.push(ilike(shelf.shelf_name, `%${filters.shelf_name}%`));
    if (filters.store_location !== undefined) sqlFilters.push(ilike(shelf.shelf_store_location, `%${filters.store_location}%`));

    if (filters.organization_id !== undefined && user.role === 'sys_admin')
        sqlFilters.push(ilike(shelf.shelf_store_location, `%${filters.store_location}%`));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await findShelves(
        filters.limit, offset, sqlFilter, [filters.sort ?? 'asc', filters.sort_by ?? 'id']
    );

    const filteredResultsCount = await countShelvesByFilter(sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countShelvesByFilter(),
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
export async function getShelfById(id: number, user: TAuthenticatedUser): Promise<TShelfWithDetailedPositionsOrganizations> {
    const shelf = await findShelfById(id);

    if (!shelf)
        throw new NotFound('Requested shelf could not be found.', 'shelf');

    // verify that the user may access the retrieved shelf
    if (
        user.role !== 'sys_admin'
        && shelf.organization_id !== ((await verifyUsersOrganization(user.id)) ?? {id: null}).id
    ) throw new Unauthorized(
        'The requested shelf does not belong to the user\'s own organization.',
        'shelf:out-of-organization'
    );

    return shelf;
}

/**
 * Saves new or updates existing shelf.
 * @param data
 * @param user
 * @param id
 */
export async function saveShelf(data: TShelfData, user: TAuthenticatedUser, id: number|null = null): Promise<TShelfWithDetailedPositionsOrganizations> {
    const organizationId = data.organization_id;

    if (user.role !== 'sys_admin' && id === null)
        throw new Unauthorized('You are not authorized to create new shelves. Ask the admin to add new shelves to your store.', 'shelf:create');

    if (organizationId !== undefined && user.role !== 'sys_admin')
        throw new Unauthorized('You are not authorized to set the organization ID for a shelf.', 'shelf:set-organization');

    // when we are updating data of a given shelf
    if (id !== null) {
        const existingShelf = await findShelfById(id);

        if (!existingShelf)
            throw new NotFound('The shelf to be updated was not found.', 'shelf');

        if (
            user.role !== 'sys_admin'
            && existingShelf.organization_id !== ((await verifyUsersOrganization(user.id)) ?? {id: null}).id
        ) throw new Unauthorized(
            'The requested shelf does not belong to the user\'s own organization.',
            'shelf:out-of-organization'
        );

        await updateShelf(data, existingShelf.id);
        return (await findShelfById(existingShelf.id)) as TShelfWithDetailedPositionsOrganizations;
    }

    if (organizationId === undefined)
        throw new BadRequest('When creating new shelf, the organization_id must be set.');

    const createdShelf = await insertShelf({...data, organization_id: organizationId});
    return (await findShelfById(createdShelf.id)) as TShelfWithDetailedPositionsOrganizations;
}

/**
 * Permanently deletes a shelf.
 * @param id
 * @param user
 */
export async function removeShelf(id: number, user: TAuthenticatedUser): Promise<void> {
    const shelf = await getShelfById(id, user);
    return deleteShelf(shelf.id);
}