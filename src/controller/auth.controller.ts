import Elysia, {error, t} from "elysia";
import {
    authDevice,
    createResetPasswordRequest, getUserIdentityFromId,
    invalidateToken,
    login,
    refreshAuth as refreshAuthTokens, setNewUserPassword
} from "../service/auth.service";
import {differenceInSeconds} from "date-fns";
import {authResponse, deviceAuthData, loginData, newPasswordData, passwordResetRequestData} from "../model/auth.model";
import {authUserPlugin, authDevicePlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {NotFound} from "../error/not-found.error";
import {userProfileResponse} from "../model/user.model";
import {transformUserProfile} from "../util/transformers/user.transformer";

export const authController = new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .use(authUserPlugin)
    .use(authDevicePlugin)
    .post('/login', async ({ body, cookie: { refreshAuth } }) => {
        const {access, refresh} = await login(body.email, body.password);

        // set the refresh token to a cookie
        refreshAuth.set({
            expires: refresh.validUntil,
            maxAge: Math.abs(differenceInSeconds(new Date(), refresh.validUntil)),
            secure: true,
            httpOnly: true,
            value: refresh.jwt,
        });

        return { access };
    }, {
        body: loginData,
        cookie: t.Cookie({ refreshAuth: t.Optional(t.String()) }),
        detail: {
            description: 'Generates JWT access and refresh token for user authenticated by provided credentials. The refresh token is set to an HTTP only cookie.'
        },
        response: authResponse
    })
    .get('/token-refresh', async ({ cookie: { refreshAuth } }) => {
        if (!refreshAuth.value) throw new Unauthenticated();

        const {access, refresh} = await refreshAuthTokens(refreshAuth.value);

        // set the refresh token to a cookie
        refreshAuth.update({
            expires: refresh.validUntil,
            maxAge: Math.abs(differenceInSeconds(new Date(), refresh.validUntil)),
            value: refresh.jwt
        });

        return { access };
    }, {
        cookie: t.Cookie({ refreshAuth: t.Optional(t.String()) }),
        response: {
            200: authResponse
        },
        detail: {description: 'Generates refreshed access and refresh tokens based on current refresh token in the cookie.'},
    })
    .delete('/logout', async ({ set, cookie: { refreshAuth } }) => {
        if (refreshAuth.value) await invalidateToken(refreshAuth.value);
        refreshAuth.remove();

        set.status = 204;
        return;
    }, {
        cookie: t.Cookie({ refreshAuth: t.Optional(t.String()) }),
        detail: { description: 'Invalidates current refresh token and removes the cookie.' },
    })
    .post('/device-login', async ({ body }) => {
        const accessToken = await authDevice(body.serial_number, body.device_secret);
        return { access: accessToken };
    }, {
        body: deviceAuthData,
        response: {
            200: authResponse
        },
        detail: {
            description: 'Generates short-lived access token for an IoT gateway based on its serial number and device secret.'
        },
    })
    .post('/reset-password', async ({ body, set }) => {
        set.status = 204;

        // catch error when the user does not exist - spambots could test whether user with given email exists
        try {
            await createResetPasswordRequest(body);
        }
        catch (err) {
            if (err instanceof NotFound && err.entity === 'user')
                return;

            throw err;
        }
    }, {
        detail: { description: 'Allows a user to request a password reset.' },
        body: passwordResetRequestData,
        response: {
            204: t.Undefined()
        }
    })
    .post('/new-password/:resetRequestId', async ({ body, params, set }) => {
        await setNewUserPassword(params.resetRequestId, body);
        set.status = 204;
    }, {
        detail: { description: 'Allows the user to set their new password based on the reset password request code.' },
        params: t.Object({ resetRequestId: t.Number() }),
        body: newPasswordData,
        response: {
            204: t.Undefined()
        }
    })
    .get('/identity', async ({ user }) => {
        const userProfile = await getUserIdentityFromId(user!.id);
        return transformUserProfile(userProfile);
    }, {
        authUser: EAuthRequirement.Optional,
        detail: {
            description: 'Retrieves user\'s identity based on the provided access token.'
        },
        response: {
            200: userProfileResponse
        }
    })
;