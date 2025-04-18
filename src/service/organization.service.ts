import {TOrganization} from "../db/schema/organization";
import {TOrganizationData} from "../model/organization.model";
import {
    createOrganization, deleteOrganization,
    getOrganizationById,
    getOrganizationByName,
    updateOrganization
} from "../repository/organization.repository";
import {NotFound} from "../error/not-found.error";
import {BadRequest} from "../error/bad-request.error";

/**
 * Retrieves a paginated list of organizations, based on provided or default filters, and the query's offset.
 * @returns Array of retrieved organizations for the current page. Includes pagination metadata.
 */
export async function listOrganizations(): Promise<Array<TOrganization>> {

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
 * Retrieves existing organization for a given user.
 * @param userId
 */
export async function retrieveOrganizationForUser(userId: number): Promise<TOrganization> {

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