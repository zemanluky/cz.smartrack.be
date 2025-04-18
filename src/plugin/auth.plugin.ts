import Elysia from "elysia";
import {verifyUserJwt} from "../util/jwt";
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

/**
 * Throws an unauthenticated error appropriately when the auth is required, yet it is already known the user or the device
 * is not authenticated.
 * @param requirement
 */
function unauthenticated(requirement: EAuthRequirement): void {
    if (requirement === EAuthRequirement.Required)
        throw new Unauthenticated();
}

export type TAuthenticatedUser = {id: number, role: TUser['role']}
export type TAuthenticatedDevice = number|null

/**
 * Handles adding user or device data to the context &
 * early ending a request if the auth requirements are not met.
 */
export const authPlugin = new Elysia({ name: 'auth' })
    .derive(({ headers }) => {
        const authHeader = headers['Authorization'];

        if (!authHeader || !authHeader.startsWith('Bearer')) return { bearer: null };

        return { bearer: authHeader.slice(7) };
    })
    .macro({
        /**
         * Tries to authenticate the user from the request context.
         * @param requirement Specify the requirement for user authentication.
         *                    By default, the requirement is set to null which means the user's auth state won't be determined.
         */
        authUser: (requirement: EAuthRequirement|null = null) => ({
            resolve: async ({ bearer }) => {
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
        }),

        /**
         * Tries to authenticate the device from the request context.
         * @param requirement Specify the requirement for device authentication.
         *                    By default, the requirement is set to null which means the device's auth state won't be determined.
         */
        authDevice: (requirement: EAuthRequirement|null = null) => {
            if (requirement === null) return;
        },

        /**
         * Verifies that the user accessing a given endpoint is in one of a given role.
         * @param requiredUserRole
         */
        requireRole: (requiredUserRole: Array<TUser['role']>|null = null) => ({

        })
    })
    .as('plugin')
;