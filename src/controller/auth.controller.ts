import Elysia, {error, t} from "elysia";
import {invalidateToken, login, refreshAuth as refreshAuthTokens} from "../service/auth.service";
import {differenceInSeconds} from "date-fns";

export const authController = new Elysia({ prefix: '/auth', tags: ['Auth'] })
    .post('/login', async ({ body, cookie: { refreshAuth } }) => {
        const {access, refresh} = await login(body.email, body.password);

        // set the refresh token to a cookie
        refreshAuth.set({
            expires: refresh.validUntil,
            maxAge: differenceInSeconds(new Date(), refresh.validUntil),
            secure: true,
            httpOnly: true,
            value: refresh.jwt,
        });

        return { access };
    }, {
        body: t.Object({
            email: t.String(),
            password: t.String()
        }),
        cookie: t.Cookie({
            refreshAuth: t.String()
        }),
        detail: {
            description: 'Generates JWT access and refresh token for user authenticated by provided credentials. The refresh token is set to an HTTP only cookie.'
        },
        response: t.Object({
            access: t.String()
        })
    })
    .get('/token-refresh', async ({ cookie: { refreshAuth } }) => {
        if (!refreshAuth.value) throw error(401);

        const {access, refresh} = await refreshAuthTokens(refreshAuth.value);

        // set the refresh token to a cookie
        refreshAuth.update({
            expires: refresh.validUntil,
            maxAge: differenceInSeconds(new Date(), refresh.validUntil),
            value: refresh.jwt
        });

        return { access };
    }, {
        cookie: t.Cookie({
            refreshAuth: t.String()
        }),
        response: t.Object({
            access: t.String()
        }),
        detail: {
            description: 'Generates refreshed access and refresh tokens based on current refresh token in the cookie.'
        },
    })
    .delete('/logout', async ({ set, cookie: { refreshAuth } }) => {
        if (refreshAuth.value) await invalidateToken(refreshAuth.value);
        refreshAuth.remove();

        set.status = 204;
        return;
    }, {
        cookie: t.Cookie({
            refreshAuth: t.String()
        }),
        detail: {
            description: 'Invalidates current refresh token and removes the cookie.'
        },
    })
    .post('/device-login', ({}) => {

    }, {
        detail: {
            description: 'Generates short-lived access token for an IoT gateway based on its serial number and device secret.'
        },
    })
    .get('/identity', ({}) => {

    }, {
        detail: {
            description: 'Retrieves user\'s identity based on the provided access token.'
        },
    })
;