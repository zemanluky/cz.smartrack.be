import {JWTPayload, jwtVerify, SignJWT,} from 'jose';
import {TUser} from "../db/schema/user";
import {addDays, addMinutes} from "date-fns";

const JWT_CLAIM_ROLE = 'sub:role';
const JWT_ISSUER = Bun.env.JWT_ISSUER || 'smartrack';
const JWT_APP_AUDIENCE = 'smartrack-app';
const JWT_IOT_AUDIENCE = 'smartrack-device';

/**
 * Gets the JWT secret from the environment variables.
 */
function getJwtSecret(): Uint8Array {
    const secret = Bun.env.JWT_SECRET;

    if (!secret)
        throw new Error(
            'JWT_SECRET is not set in the environment variables. Please configure the application correctly with this environment variable.'
        );

    return new TextEncoder().encode(secret);
}

/**
 * Generates and signs a JWT token.
 */
export async function generateUserJwt(userId: number, role: TUser['role']): Promise<string> {
    const issueDate = new Date();
    const expirationDate = addMinutes(issueDate, 10);

    return new SignJWT({ [JWT_CLAIM_ROLE]: role })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime(expirationDate)
        .setSubject(userId.toString())
        .setAudience(JWT_APP_AUDIENCE)
        .setIssuedAt(issueDate)
        .setIssuer(JWT_ISSUER)
        .sign(getJwtSecret())
    ;
}

/**
 * Generates and signs a refresh JWT token.
 * @param userId
 * @param jti
 * @param validUntil
 */
export async function generateUserRefreshJwt(userId: number, jti: string, validUntil: Date): Promise<string> {
    return new SignJWT()
        .setExpirationTime(validUntil)
        .setSubject(userId.toString())
        .setAudience(JWT_APP_AUDIENCE)
        .setIssuedAt()
        .setIssuer(JWT_ISSUER)
        .setJti(jti)
        .sign(getJwtSecret())
    ;
}

/**
 * Generates and signs a JWT token for a device.
 */
export async function generateDeviceJwt(deviceId: number): Promise<string> {
    const issueDate = new Date();
    const expirationDate = addMinutes(issueDate, 5);

    return new SignJWT()
        .setExpirationTime(expirationDate)
        .setSubject(deviceId.toString())
        .setAudience(JWT_IOT_AUDIENCE)
        .setIssuedAt(issueDate)
        .setIssuer(JWT_ISSUER)
        .sign(getJwtSecret())
    ;
}

export type TJwtVerifiedUser = { userId: number, role: TUser['role'] };

/**
 * Verifies a given JWT token.
 * @param token
 * @returns False when the token is invalid, user's identifier (ID) and role otherwise.
 */
export async function verifyUserJwt(token: string): Promise<TJwtVerifiedUser|false> {
    const { payload } = await jwtVerify<JWTPayload & { [JWT_CLAIM_ROLE]: TUser['role'] }>(token, getJwtSecret(), {
        audience: JWT_APP_AUDIENCE,
        issuer: JWT_ISSUER,
        requiredClaims: [JWT_CLAIM_ROLE]
    });

    const userId = Number(payload.sub);
    return !isNaN(userId) ? { userId, role: payload[JWT_CLAIM_ROLE] } : false;
}

type TVerifyRefreshJwtPair = { userId: number, jti: string };

/**
 *
 * @param token
 * @returns False when the token is invalid, otherwise properties to identify the user and the token.
 */
export async function verifyUserRefreshJwt(token: string): Promise<TVerifyRefreshJwtPair|false> {
    const { payload: { sub, jti } } = await jwtVerify(token, getJwtSecret(), {
        audience: JWT_APP_AUDIENCE,
        issuer: JWT_ISSUER,
        requiredClaims: ['jti']
    });

    const userId = Number(sub);
    return !isNaN(userId) ? { userId, jti: jti as string } : false;
}

/**
 * Verifies a given JWT token for a device.
 * @param token
 * @returns False when the token is invalid, device's identifier (ID) otherwise.
 */
export async function verifyDeviceJwt(token: string): Promise<number|false> {
    const { payload: { sub } } = await jwtVerify(token, getJwtSecret(), {
        audience: JWT_IOT_AUDIENCE,
        issuer: JWT_ISSUER
    });

    const userId = Number(sub);
    return !isNaN(userId) ? userId : false;
}
