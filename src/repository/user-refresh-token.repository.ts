import {db} from "../db/db";
import {TUserRefreshToken, userRefreshToken} from "../db/schema/user";
import {and, asc, desc, eq, inArray, isNull, lt} from "drizzle-orm";

/**
 * Saves a refresh token to database.
 * @param userId ID to whom the token was issued. Expects to receive ID of an existing user.
 * @param jti The jwt's id.
 * @param expireAt The expiration date of the token.
 */
export async function addRefreshToken(userId: number, jti: string, expireAt: Date): Promise<void> {
    await db.insert(userRefreshToken).values({
        jti,
        user_id: userId,
        valid_until: expireAt
    })
}

/**
 * Retrieves a refresh token by its jti and the user to whom the token was issued.
 * It only retrieves the token when it's still valid and non-revoked.
 * @param userId
 * @param jti
 */
export async function getValidRefreshTokenByJti(userId: number, jti: string): Promise<TUserRefreshToken|undefined> {
    return await db.query.userRefreshToken.findFirst({
        where: and(
            eq(userRefreshToken.jti, jti),
            eq(userRefreshToken.user_id, userId),
            isNull(userRefreshToken.revoked_at),
            lt(userRefreshToken.valid_until, new Date())
        )
    });
}

/**
 * Revokes refresh tokens by their IDs.
 * @param ids
 */
export async function revokeTokensByIds(...ids: number[]): Promise<void> {
    if (!ids.length) return;

    await db
        .update(userRefreshToken)
        .set({
            revoked_at: new Date(),
        })
        .where(
            and(
                inArray(userRefreshToken.id, ids),
                isNull(userRefreshToken.revoked_at)
            )
        );
}

/**
 * Revokes refresh tokens by their JTI identificator.
 * @param jtis
 */
export async function revokeTokensByJti(...jtis: string[]): Promise<void> {
    if (!jtis.length) return;

    await db
        .update(userRefreshToken)
        .set({
            revoked_at: new Date(),
        })
        .where(
            and(
                inArray(userRefreshToken.jti, jtis),
                isNull(userRefreshToken.revoked_at)
            )
        );
}

/**
 * Gets user's non-revoked refresh tokens from the newest one.
 * @param userId
 */
export async function getUsersNonRevokedTokens(userId: number): Promise<Array<TUserRefreshToken>> {
    return await db.query.userRefreshToken.findMany({
        orderBy: [desc(userRefreshToken.created_at)],
        where: and(
            eq(userRefreshToken.user_id, userId),
            isNull(userRefreshToken.revoked_at),
            lt(userRefreshToken.valid_until, new Date())
        )
    });
}