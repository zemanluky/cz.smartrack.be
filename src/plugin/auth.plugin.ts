import Elysia, {Context} from "elysia";
import {verifyDeviceJwt, verifyUserJwt} from "../util/jwt";
import {Unauthenticated} from "../error/unauthenticated.error";
import {TUser} from "../db/schema/user";
import {Unauthorized} from "../error/unauthorized.error";

export enum EAuthRequirement {
    /** User or device has to be authenticated */
    Required,
    /** User or device may be authenticated. When authenticated, the user/device is added to the request context. */
    Optional,
    /** User or device cannot be authenticated to this endpoint. */
    Denied
}

export type TAuthenticatedUser = {id: number, role: TUser['role']};
export type TAuthenticatedDevice = number;

export type TAuthDeriveReturn = { user?: TAuthenticatedUser|null, device?: TAuthenticatedDevice|null };

/**
 * Throws an unauthenticated error appropriately when the auth is required, yet it is already known the user or the device
 * is not authenticated.
 * @param requirement
 */
function unauthenticated(requirement: EAuthRequirement): void {
    if (requirement === EAuthRequirement.Required)
        throw new Unauthenticated();
}



export const bearerDerivePlugin = new Elysia({ name: 'bearer-derive' })
    .derive(({ headers }) => {
        const authHeader = headers['authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer')) return { bearer: null };

        return { bearer: authHeader.slice(7) };
    })
    .as('plugin')
;


/**
 * Handles adding authenticated user's data to the context &
 * early ending the request if the auth requirements are not met.
 */
export const authUserPlugin = new Elysia({ name: 'auth-user' })
    .use(bearerDerivePlugin)
    .macro({
        /**
         * Tries to authenticate the user from the request context.
         * @param requirement Specify the requirement for user authentication.
         *                    By default, the requirement is set to null which means the user's auth state won't be determined.
         */
        authUser: (requirement: EAuthRequirement|null = null) => ({
            resolve: async ({ bearer }): Promise<TAuthDeriveReturn> => {
                if (requirement === null) return { user: null };

                if (!bearer) {
                    unauthenticated(requirement);
                    return { user: null };
                }

                const verifiedUser = await verifyUserJwt(bearer);

                if (!verifiedUser) {
                    unauthenticated(requirement);
                    return { user: null };
                }

                if (requirement === EAuthRequirement.Denied) throw new Unauthorized();

                return { user: { id: verifiedUser.userId, role: verifiedUser.role } };
            },
        })
    })
    .as('plugin')
;

/**
 * Handles adding authenticated device's data to the context &
 * early ending the request if the auth requirements are not met.
 */
export const authDevicePlugin = new Elysia({ name: 'auth-device' })
    .use(bearerDerivePlugin)
    .macro({
        /**
         * Tries to authenticate the device from the request context.
         * @param requirement Specify the requirement for device authentication.
         *                    By default, the requirement is set to null which means the device's auth state won't be determined.
         */
        authDevice: (requirement: EAuthRequirement|null = null) => ({
            resolve: async ({ bearer }): Promise<TAuthDeriveReturn> => {
                if (requirement === null) return { device: null };

                if (!bearer) {
                    unauthenticated(requirement);
                    return { device: null };
                }

                const verifiedDevice = await verifyDeviceJwt(bearer);

                if (!verifiedDevice) {
                    unauthenticated(requirement);
                    return { device: null };
                }

                if (requirement === EAuthRequirement.Denied) throw new Unauthorized();

                return { device: verifiedDevice };
            },
        }),
    })
    .as('plugin')
;