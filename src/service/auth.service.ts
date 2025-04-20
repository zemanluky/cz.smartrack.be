import {getUserByEmail, getUserById} from "../repository/user.repository";
import {generateDeviceJwt, generateUserJwt, generateUserRefreshJwt, verifyUserRefreshJwt} from "../util/jwt";
import {TUser} from "../db/schema/user";
import {addDays} from "date-fns";
import {
    addRefreshToken,
    getUsersNonRevokedTokens, getValidRefreshTokenByJti,
    revokeTokensByIds, revokeTokensByJti
} from "../repository/user-refresh-token.repository";
import * as R from "remeda";
import {Unauthenticated} from "../error/unauthenticated.error";
import environment from "../util/environment";
import {findDeviceBySerial} from "../repository/device.repository";

const CONFIG_MAX_REFRESH_TOKENS: number = environment.CONFIG_MAX_REFRESH_TOKENS || 5;
const CONFIG_REFRESH_TOKEN_DAYS_LIFE: number = environment.CONFIG_REFRESH_TOKEN_DAYS_LIFE || 7;

export type TRefreshToken = { jwt: string, validUntil: Date };
export type TTokenPair = { access: string, refresh: TRefreshToken };

/**
 * Generates new JWT refresh token and saves the information to database.
 */
async function createRefreshToken(user: TUser): Promise<TRefreshToken> {
    const expireAt = addDays(new Date(), CONFIG_REFRESH_TOKEN_DAYS_LIFE);

    const jti = Bun.randomUUIDv7();
    const jwt = await generateUserRefreshJwt(user.id, jti, expireAt);

    await addRefreshToken(user.id, jti, expireAt);

    // revoke oldest token
    const tokens = await getUsersNonRevokedTokens(user.id);
    const tokenIdsToRevoke = R.pipe(
        tokens,
        R.drop(CONFIG_MAX_REFRESH_TOKENS),
        R.map((rt) => rt.id)
    );

    await revokeTokensByIds(...tokenIdsToRevoke);
    return { jwt, validUntil: expireAt };
}

/**
 * Logs in a user based on their credentials and generates their access and refresh tokens.
 * It automatically invalidates oldest refresh token if the user has more than the allowed number.
 * @param email
 * @param password
 */
export async function login(email: string, password: string): Promise<TTokenPair> {
    const user = await getUserByEmail(email);

    if (!user) throw new Unauthenticated('Provided credentials are invalid.', 'invalid_credentials');

    const isPasswordMatch = await Bun.password.verify(password, user.password_hash);

    if (!isPasswordMatch) throw new Unauthenticated('Provided credentials are invalid.', 'invalid_credentials');

    return {
        access: await generateUserJwt(user.id, user.role),
        refresh: await createRefreshToken(user)
    }
}

/**
 * Authenticates a device based on its serial number and secret. It only generates an access token with shorter expiration time.
 * @param serialNumber
 * @param deviceSecret
 */
export async function authDevice(serialNumber: string, deviceSecret: string): Promise<string> {
    const device = await findDeviceBySerial(serialNumber);

    if (!device) throw new Unauthenticated('Provided device credentials are invalid.', 'invalid_device_credentials');

    const isSecretMatch = await Bun.password.verify(deviceSecret, device.device_secret);

    if (!isSecretMatch) throw new Unauthenticated('Provided credentials are invalid.', 'invalid_credentials');

    return generateDeviceJwt(device.id);
}

/**
 * Generates new access token based on valid refresh token.
 * It also generates new refresh token and invalidates the old one.
 * @param refreshTokenJwt
 */
export async function refreshAuth(refreshTokenJwt: string): Promise<TTokenPair> {
    const result = await verifyUserRefreshJwt(refreshTokenJwt);

    // invalid jwt provided
    if (!result) throw new Unauthenticated('The provided refresh token is expired. Please, log-in again.', 'expired');

    const { jti, userId } = result;
    const refreshToken = await getValidRefreshTokenByJti(userId, jti);

    // the refresh token is not valid (probably revoked)
    if (!refreshToken)
        throw new Unauthenticated(
            'The provided refresh token is expired. Please, log-in again.', 'expired'
        );

    const user = await getUserById(userId);

    // the user does not exist, they should not have access to the app
    if (!user)
        throw new Unauthenticated(
            'The provided refresh token no longer authenticates any existing user.', 'invalid_credentials'
        );

    // invalidate it as it will be rotated for new one
    await revokeTokensByIds(refreshToken.id);

    return {
        access: await generateUserJwt(user.id, user.role),
        refresh: await createRefreshToken(user)
    }
}

/**
 * Invalidates given refresh token.
 * @param refreshToken
 */
export async function invalidateToken(refreshToken: string): Promise<void> {
    const result = await verifyUserRefreshJwt(refreshToken);

    // the token is invalid already by itself
    if (!result) return;

    await revokeTokensByJti(result.jti);
}

/**
 * Allows to retrieve information about a given user by their ID.
 *
 * This method, however, does not check whether the current user may access data about the user with the given ID.
 * This method, therefore, should **only be used to retrieve user's own profile.**
 *
 * @throws {Unauthenticated} It also expects the user to exist. If not found, Unauthenticated is thrown.
 * @param id ID of the user.
 */
export async function getUserIdentityFromId(id: number): Promise<TUser> {
    const user = await getUserById(id);

    if (!user)
        throw new Unauthenticated(
            'The provided refresh token no longer authenticates any existing user.', 'invalid_credentials'
        );

    return user;
}
