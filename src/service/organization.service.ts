import {organization, TOrganization} from "../db/schema/organization";
import {TOrganizationData, TOrganizationListQuery} from "../model/organization.model";
import {
    countItemsByFilter,
    createOrganization, deleteOrganization,
    getOrganizationById,
    getOrganizationByName, getOrganizations,
    updateOrganization
} from "../repository/organization.repository";
import {NotFound} from "../error/not-found.error";
import {BadRequest} from "../error/bad-request.error";
import {and, eq, ilike, SQL} from "drizzle-orm";
import {TPaginationMetadata} from "../model/pagination.model";

/**
 * Retrieves a paginated list of organizations, based on provided or default filters, and the query's offset.
 * @returns Array of retrieved organizations for the current page. Includes pagination metadata.
 */
export async function listOrganizations(filters: TOrganizationListQuery): Promise<{ metadata: TPaginationMetadata, items: Array<TOrganization> }> {
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;

    const sqlFilters: Array<SQL> = [];

    if (filters.name) sqlFilters.push(ilike(organization.name, `%${filters.name}%`));
    if (filters.active !== undefined) sqlFilters.push(eq(organization.active, filters.active));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await getOrganizations(
        filters.limit, offset, sqlFilter, [filters.sort, filters.sort_by]
    );

    const filteredResultsCount = await countItemsByFilter(sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countItemsByFilter(),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

/**
 * Retrieves existing organization by its ID.
 * @param id ID to retrieve the organization by.
 * @returns The found organization.
 * @throws {NotFound} When the organization is not found.
 */
export async function retrieveOrganization(id: number): Promise<TOrganization> {
    const result = await getOrganizationById(id);

    if (!result)
        throw new NotFound('The requested organization was not found.', 'organization');

    return result;
}

/**
 * Creates a new organization or updates existing one.
 * Note that this method should only be called when the user is a system admin.
 * @param data The data to create the organization from.
 * @param id The id of the organization to update.
 * @returns The created or updated organization.
 */
export async function saveOrganization(data: TOrganizationData, id: number|null = null): Promise<TOrganization> {
    // verify that the name is not already in use
    const existingOrganization = await getOrganizationByName(data.name);

    if (existingOrganization !== null && existingOrganization.id !== id)
        throw new BadRequest(
            `Cannot use given name for the ${id === null ? 'created' : 'updated'} organization as it is already in use 
            by another organization.`, 'organization:duplicate_name'
        );

    // updating existing organization
    if (id !== null) {
        const updated = await updateOrganization(id, data);

        if (!updated)
            throw new NotFound('The organization to update was not found.', 'organization');

        return updated;
    }

    return await createOrganization(data);
}

/**
 * Deletes existing organization by its ID.
 * @param id The id of the organization to delete.
 */
export async function removeOrganization(id: number): Promise<void> {
    const isDeletedOrg = await deleteOrganization(id);

    if (!isDeletedOrg) throw new NotFound('The requested organization to delete was not found.', 'organization');
}