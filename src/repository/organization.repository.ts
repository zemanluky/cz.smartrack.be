import {organization, TOrganization} from "../db/schema/organization";
import {db} from "../db/db";
import {TOrganizationData} from "../model/organization.model";
import {eq, count, SQL, getTableColumns, asc, desc} from "drizzle-orm";
import {TUser, user} from "../db/schema/user";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";

/**
 * Retrieves a list of organizations.
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function getOrganizations(
    limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TOrganization>> {
    return await db.query.organization.findMany({
        ...(filters ? {where: filters} : {}),
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        limit, offset,
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countItemsByFilter(filters: SQL|null = null): Promise<number> {
    if (filters) {
        const result = await db.select({ count: count() }).from(organization).where(filters);
        return result[0].count;
    }

    const result = await db.select({ count: count() }).from(organization);
    return result[0].count;
}

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

type TGetOrganizationByUserResult = { organization: TOrganization|null, user: TUser };

/**
 * Retrieves organization by user's ID.
 * If the user is not assigned to any organization, null is returned.
 * @param userId
 * @returns Object with assigned user's organization and the user themselves.
 *          When the user does not have an organization assigned, object with only the user is returned.
 *          In case the user does not exist, null is returned.
 */
export async function getOrganizationByUserId(userId: number): Promise<TGetOrganizationByUserResult|null> {
    const result = await db.select()
        .from(organization)
        .rightJoin(user, eq(organization.id, user.organization_id))
        .where(eq(user.id, userId))
        .limit(1)
    ;

    if (result.length === 0) return null;

    return result[0];
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