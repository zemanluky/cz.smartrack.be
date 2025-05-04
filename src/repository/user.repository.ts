import {TUser, TUserInsert, user} from "../db/schema/user";
import {db} from "../db/db";
import {count, eq, SQL} from "drizzle-orm";
import {product} from "../db/schema/product";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";
import {TOrganization} from "../db/schema/organization";

export type TUserWithOrganization = TUser & { organization: TOrganization|null };

/**
 * Retrieves a list of products for a given organization.
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function findUsers(
    limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TUserWithOrganization>> {
    return db.query.user.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        with: { organization: true },
        where: (filters ?? undefined),
        limit, offset
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countUsersByFilter(filters: SQL|null = null): Promise<number> {
    const result = await db.select({ count: count() })
        .from(product)
        .where(filters ?? undefined)
    ;
    return result[0].count;
}

/**
 * Retrieves a user by their email address.
 * @param email
 */
export async function findUserByEmail(email: string): Promise<TUserWithOrganization|null> {
    const result = await db.query.user.findFirst({
        where: eq(user.email, email),
        with: {organization: true}
    });
    return result ?? null;
}

/**
 * Retrieves a user by their ID.
 * @param userId
 */
export async function findUserById(userId: number): Promise<TUserWithOrganization|null> {
    const result = await db.query.user.findFirst({
        where: eq(user.id, userId),
        with: {organization: true}
    });
    return result ?? null;
}

/**
 * Inserts a new user.
 * @param data Data to create the user with.
 */
export async function insertUser(data: TUserInsert): Promise<TUser> {
    const result = await db.insert(user).values(data).returning();
    return result[0];
}

/**
 * Updates user's profile data, such as name, login email.
 * @param data The data to update the user with.
 * @param id ID of the user to update.
 */
export async function updateUserProfile(data: Partial<Omit<TUser, 'id'|'deleted_at'>>, id: number): Promise<TUser> {
    const result = await db.update(user)
        .set(data)
        .where(eq(user.id, id))
        .returning()
    ;

    if (result.length === 0)
        throw new Error('Expected the user to update to exist.');

    return result[0];
}

/**
 * Soft-deletes or restores a given user by their ID.
 * This method expects the user to exist.
 * @param id ID of the user to soft-delete or restore.
 * @param isDelete When true (default), the user is soft-deleted, whereas when false, the user is restored.
 */
export async function softDeleteUser(id: number, isDelete: boolean = true): Promise<TUser> {
    const result = await db.update(user)
        .set({ deleted_at: isDelete ? new Date() : null })
        .where(eq(product.id, id))
        .returning()
    ;

    if (result.length === 0)
        throw new Error('Expected the user to soft-delete or restore to exists.')

    return result[0];
}