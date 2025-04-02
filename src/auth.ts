import {betterAuth} from "better-auth";
import {drizzleAdapter} from "better-auth/adapters/drizzle";
import {db} from "./db/db";
import Elysia from "elysia";
import {jwt} from "better-auth/plugins";

export const auth = betterAuth({
    // extra plugins to help with auth
    plugins: [
        jwt()
    ],

    // integrate with our database
    database: drizzleAdapter(db, { provider: 'pg' }),

    // allow only auth method for the purposes of this being a school project - email and password
    emailAndPassword: {
        enabled: true,
        disableSignUp: true, // disable sign up - only admin user may create new users
    },

    // mount all routes on /auth
    basePath: '/auth',


});

export const authController = new Elysia()
    .mount(auth.handler)
    .macro({
        auth: {
            /** Gets authentication result. */
            async resolve({ error, request: { headers } }) {
                const session = await auth.api.getSession({ headers });

                if (!session) return error(401);

                return { user: session.user, session: session.session };
            },
        }
    })
;