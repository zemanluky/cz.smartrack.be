import {findUserByEmail, findUserById, TUserWithOrganization, updateUserProfile} from "../repository/user.repository";
import {generateDeviceJwt, generateUserJwt, generateUserRefreshJwt, verifyUserRefreshJwt} from "../util/jwt";
import {TUser, TUserResetPasswordRequest} from "../db/schema/user";
import {addDays, addHours} from "date-fns";
import {
    addRefreshToken,
    getUsersNonRevokedTokens, getValidRefreshTokenByJti,
    revokeTokensByIds, revokeTokensByJti
} from "../repository/user-refresh-token.repository";
import * as R from "remeda";
import {Unauthenticated} from "../error/unauthenticated.error";
import environment from "../util/environment";
import {findGatewayDeviceBySerial} from "../repository/gateway-device.repository";
import {TNewPasswordData, TPasswordResetRequestData} from "../model/auth.model";
import {
    findValidResetPasswordRequestById,
    insertResetPasswordRequest
} from "../repository/user-reset-password-request.repository";
import {BadRequest} from "../error/bad-request.error";
import {NotFound} from "../error/not-found.error";
import {sendResetPasswordRequestEmail} from "../util/email/email";

const CONFIG_MAX_REFRESH_TOKENS: number = environment.CONFIG_MAX_REFRESH_TOKENS || 5;
const CONFIG_REFRESH_TOKEN_DAYS_LIFE: number = environment.CONFIG_REFRESH_TOKEN_DAYS_LIFE || 7;
const CONFIG_RESET_PASSWORD_REQUEST_VALIDITY: number = environment.CONFIG_RESET_PASSWORD_REQUEST_VALIDITY || 1; // 1 hour

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
    const user = await findUserByEmail(email);

    if (!user || user.deleted_at !== null) throw new Unauthenticated('Provided credentials are invalid.', 'invalid_credentials');
    if (!user.password_hash) throw new BadRequest('Unable to log-in. User must set their initial password before logging in.');

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
    const device = await findGatewayDeviceBySerial(serialNumber);

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

    const user = await findUserById(userId);

    // the user does not exist, they should not have access to the app
    if (!user || user.deleted_at !== null)
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
export async function getUserIdentityFromId(id: number): Promise<TUserWithOrganization> {
    const user = await findUserById(id);

    if (!user)
        throw new Unauthenticated(
            'The provided refresh token no longer authenticates any existing user.', 'invalid_credentials'
        );

    return user;
}

/**
 * Creates new reset password requests. This sends an email to the given user, if their account exists, containing the
 * id and security code for resetting the password.
 * @param data The data to create the reset request with.
 * @param initialRequest When true, creates non-expiring reset password request. This also does not send the email,
 *                       as it expects the callee to send the invite email containing the set password link.
 *                       Useful when new account is created - e.g. for setting first password.
 */
export async function createResetPasswordRequest(
    data: TPasswordResetRequestData, initialRequest: boolean = false
): Promise<{ request: TUserResetPasswordRequest, code: string }> {
    const user = await findUserByEmail(data.email);

    if (!user)
        throw new NotFound('The user to create the reset password request for does not exist.', 'user');

    const resetRequestCode = R.randomString()(24);
    const resetRequest = await insertResetPasswordRequest({
        user_id: user.id,
        valid_until: !initialRequest
            ? addHours(new Date(), CONFIG_RESET_PASSWORD_REQUEST_VALIDITY)
            : null,
        reset_request_code_hash: await Bun.password.hash(resetRequestCode)
    });

    // the request is a request coming from the client directly, send the email.
    if (!initialRequest) {
        const emailResult = await sendResetPasswordRequestEmail(user.email, {
            name: user.name,
            link: generateResetPasswordLink(resetRequest.id, resetRequestCode),
            expiryHours: CONFIG_RESET_PASSWORD_REQUEST_VALIDITY
        });

        if (emailResult.error !== null)
            throw new Error('Failed to correctly send the request password email.');
    }

    return {request: resetRequest, code: resetRequestCode};
}

/**
 * Generates link to the FE application where new password can be set.
 * Attaches query parameters to the link which identify the request.
 * @param id ID of the reset password request.
 * @param code Security code of the reset password request.
 * @param isInitialPasswordSet Whether the password is set for the first time.
 */
export function generateResetPasswordLink(id: number, code: string, isInitialPasswordSet: boolean = false): string {
    const baseLink = `${environment.CONFIG_FRONTEND_RESET_PASSWORD_LINK}?reqId=${id}&reqVerify=${code}`;

    if (isInitialPasswordSet)
        return baseLink + `&initialPasswordSet=true`;

    return baseLink;
}

/**
 * Sets a new password to a user assigned to a given reset password request.
 * @param requestId
 * @param data
 */
export async function setNewUserPassword(requestId: number, data: TNewPasswordData): Promise<void> {
    const validResetRequest = await findValidResetPasswordRequestById(requestId);

    if (!validResetRequest)
        throw new BadRequest('The reset password request has already been used or expired. Please, try again.');

    const isCodeMatch = await Bun.password.verify(data.code, validResetRequest.reset_request_code_hash);

    if (!isCodeMatch)
        throw new BadRequest('Invalid password reset request parameters.');

    // valid request, set new password
    const newPasswordHash = await Bun.password.hash(data.password);
    await updateUserProfile({ password_hash: newPasswordHash }, validResetRequest.user.id);
}
