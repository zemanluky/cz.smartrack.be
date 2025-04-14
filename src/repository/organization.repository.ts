import {organization, TOrganization} from "../db/schema/organization";
import {db} from "../db/db";
import {TOrganizationData} from "../model/organization.model";
import {eq} from "drizzle-orm";

/**
 * Retrieves organization by its ID.
 * @param id
 * @returns The found organization or null when not found.
 */
export async function getOrganizationById(id: number): Promise<TOrganization|null> {
    const result = await db.query.organization.findFirst({
        where: eq(organization.id, id),
    });
    return result ?? null;
}

/**
 * Retrieves organization by its name.
 * @param name The name to find the organization by. It must be an exact match.
 * @returns Either the found organization or null.
 */
export async function getOrganizationByName(name: string): Promise<TOrganization|null> {
    const result = await db.query.organization.findFirst({
        where: eq(organization.name, name),
    });
    return result ?? null;
}

/**
 * Inserts organization data.
 * @param data
 */
export async function createOrganization(data: TOrganizationData): Promise<TOrganization> {
    const createdOrg = await db.insert(organization).values(data).returning();

    if (!createdOrg)
        throw new Error('Failed to insert/retrieve created organization data.');

    return createdOrg[0];
}

/**
 * Updates existing organization.
 * If the organization does not exist, null is returned.
 * @param id
 * @param data
 * @returns The updated organization entity. If the organization does not exist, null is returned.
 */
export async function updateOrganization(id: number, data: TOrganizationData): Promise<TOrganization|null> {
    const updatedOrg = await db
        .update(organization)
        .set(data)
        .where(eq(organization.id, id))
        .returning()
    ;

    if (updatedOrg.length === 0)
        return null;

    return updatedOrg[0];
}

/**
 * Deletes organization by its ID.
 * @param id ID to delete the organization by.
 * @returns True when entity was found and deleted successfully. False otherwise (no entity was deleted).
 */
export async function deleteOrganization(id: number): Promise<boolean> {
    const deletedIds = await db
        .delete(organization)
        .where(eq(organization.id, id))
        .returning({ id: organization.id })
    ;

    return !(deletedIds.length === 0);
}