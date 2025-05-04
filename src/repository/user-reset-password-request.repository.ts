import { db } from "../db/db";
import {
    TUser,
    TUserResetPasswordRequest,
    TUserResetPasswordRequestInsert,
    userResetPasswordRequest
} from "../db/schema/user";
import {and, eq, gt} from "drizzle-orm";

export type TUserResetPasswordRequestWithUser = TUserResetPasswordRequest & { user: TUser };

/**
 * Finds existing reset password request by its ID.
 * @param id
 */
export async function findValidResetPasswordRequestById(id: number): Promise<TUserResetPasswordRequestWithUser|null> {
    const result = await db.query.userResetPasswordRequest.findFirst({
        where: and(
            eq(userResetPasswordRequest.id, id),
            eq(userResetPasswordRequest.is_used, false),
            gt(userResetPasswordRequest.valid_until, new Date())
        ),
        with: { user: true }
    });
    return result ?? null;
}

/**
 * Inserts new reset password request.
 * @param data
 */
export async function insertResetPasswordRequest(data: TUserResetPasswordRequestInsert): Promise<TUserResetPasswordRequest> {
    const result = await db.insert(userResetPasswordRequest).values(data).returning();
    return result[0];
}

/**
 * Disables existing reset password request.
 * @param id ID of the reset request to disable. Expects the request to exist.
 */
export async function disableResetPasswordRequest(id: number): Promise<void> {
    const result = await db
        .update(userResetPasswordRequest)
        .set({ is_used: true })
        .where(eq(userResetPasswordRequest.id, id))
        .returning()
    ;
    if (result.length === 0) throw new Error('Expected reset password request to deactivate to exist.');
}

/**
 * Disables all reset passwords request of a given user.
 * @param userId ID of the user whose reset password requests should be invalidated.
 */
export async function disableUsersResetPasswordRequest(userId: number): Promise<void> {
    const result = await db
        .update(userResetPasswordRequest)
        .set({ is_used: true })
        .where(eq(userResetPasswordRequest.user_id, userId))
        .returning()
    ;
}