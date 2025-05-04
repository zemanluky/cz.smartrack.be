import { t } from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";
import {organizationResponse} from "./organization.model";

const userRole = t.Union([
    t.Literal('sys_admin'),
    t.Literal('org_admin'),
    t.Literal('org_user')
], { description: "The user's role." });

export const listUsersQuery = t.Composite([
    paginationWithSortingQuery(['name', 'price']),
    t.Partial(t.Object({
        organization_id: t.Number({ description: 'Filters users of a given organization. Works only for system admins.'}),
        name: t.String({ description: 'Filters users by their name. Search is case insensitive and filters results containing the given query.'}),
        email: t.String({ description: 'Filters users by their email address. Search is case insensitive and filters results containing part of the search query.'}),
        role: t.Union([userRole, t.Array(userRole)]),
        active: t.Boolean()
    }))
]);
export type TListUsersQuery = typeof listUsersQuery.static;

export const saveUserData = t.Object({
    name: t.String({ minLength: 3, maxLength: 255, description: 'Name of the user.' }),
    email: t.String({ format: 'email', maxLength: 255, description: 'Login email of the user.' }),
    organization_id: t.Optional(t.Nullable(t.Number({ minimum: 1, description: 'Assigns the user to a given organization. Only sys_admins can add this property.' }))),
    role: userRole
});
export type TSaveUserData = typeof saveUserData.static;

export const userResponse = t.Object({
    organization: t.Nullable(organizationResponse),
    role: userRole,
    email: t.String(),
    name: t.String(),
    active: t.Boolean()
});
export type TUserResponse = typeof userResponse.static;

export const userProfileResponse = t.Omit(userResponse, ['active']);
export type TUserProfileResponse = typeof userProfileResponse.static;