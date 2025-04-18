import {TUser, user} from "../db/schema/user";
import {db} from "../db/db";
import {eq} from "drizzle-orm";

/**
 * Retrieves a user by their email address.
 * @param email
 */
export async function getUserByEmail(email: string): Promise<TUser|undefined> {
    return db.query.user.findFirst({
        where: eq(user.email, email)
    });
}

/**
 * Retrieves a user by their ID.
 * @param userId
 */
export async function getUserById(userId: number): Promise<TUser|undefined> {
    return db.query.user.findFirst({
        where: eq(user.id, userId)
    });
}