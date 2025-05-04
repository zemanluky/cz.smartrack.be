import {TUser, user} from "../db/schema/user";
import {TListUsersQuery, TSaveUserData} from "../model/user.model";
import {TPaginatedResult} from "../model/pagination.model";
import {TAuthenticatedUser} from "../plugin/auth.plugin";
import {
    countUsersByFilter, findUserByEmail,
    findUserById,
    findUsers, insertUser,
    softDeleteUser,
    TUserWithOrganization, updateUserProfile
} from "../repository/user.repository";
import { NotFound } from "../error/not-found.error";
import {getOrganizationByUserId} from "../repository/organization.repository";
import {Unauthorized} from "../error/unauthorized.error";
import {and, eq, gt, ilike, inArray, isNotNull, isNull, lt, SQL} from "drizzle-orm";
import {BadRequest} from "../error/bad-request.error";
import {createResetPasswordRequest, generateResetPasswordLink} from "./auth.service";
import {disableUsersResetPasswordRequest} from "../repository/user-reset-password-request.repository";
import {sendGeneralInviteEmail, sendOrganizationInviteEmail} from "../util/email/email";

/**
 * Lists users based on filters.
 * @param filters
 * @param currentUser
 */
export async function listUsers(filters: TListUsersQuery, currentUser: TAuthenticatedUser): Promise<TPaginatedResult<TUserWithOrganization>> {
    if (currentUser.role === 'org_user')
        throw new Unauthorized('You do not have access to list other users within the organization.', 'user:list-read');

    // add filter for user's own organization
    if (currentUser.role === 'org_admin') {
        const organization = await getOrganizationByUserId(currentUser.id);

        if (!organization || !organization.organization)
            throw new Error('Invalid user profile found.');

        filters.organization_id = organization.organization.id;
    }

    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;

    const sqlFilters: Array<SQL> = [];

    if (filters.name) sqlFilters.push(ilike(user.name, `%${filters.name}%`));
    if (filters.email) sqlFilters.push(ilike(user.email, `%${filters.email}%`));
    if (filters.organization_id) sqlFilters.push(eq(user.organization_id, filters.organization_id));
    if (filters.role !== undefined)
        sqlFilters.push(Array.isArray(filters.role) ? inArray(user.role, filters.role) : eq(user.role, filters.role));
    if (filters.active !== undefined)
        sqlFilters.push(filters.active ? isNull(user.deleted_at) : isNotNull(user.deleted_at));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await findUsers(
        filters.limit, offset, sqlFilter, [filters.sort ?? 'asc', filters.sort_by ?? 'id']
    );

    const filteredResultsCount = await countUsersByFilter(sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countUsersByFilter(),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

/**
 * Gets a given user by their ID.
 * This method also checks if the current user is able to view the profile.
 * @param userId
 * @param currentUser
 */
export async function getUserById(userId: number, currentUser: TAuthenticatedUser): Promise<TUserWithOrganization> {
    const user = await findUserById(userId);

    if (!user)
        throw new NotFound(`The requested user could not be found.`, 'user');

    if (user.id === currentUser.id || currentUser.role === 'sys_admin')
        return user;

    const currentUsersOrganization = await getOrganizationByUserId(currentUser.id);

    if (!currentUsersOrganization || !currentUsersOrganization.organization)
        throw new Error(
            `Invalid user profile found with ID ${currentUser.id}. The user should have an assigned organization with their role.`);

    if (currentUser.role === 'org_admin' && currentUsersOrganization.organization.id === user.organization_id)
        return user;

    throw new Unauthorized(`You do not have access to the requested user.`, 'user:read');
}

/**
 * Creates or updates user profile.
 * @param data The data to create or update the user from.
 * @param currentUser Currently logged-in user using this method.
 * @param id ID of the updated user. When null, a new user is created.
 */
export async function saveUser(data: TSaveUserData, currentUser: TAuthenticatedUser, id: number|null = null): Promise<TUserWithOrganization> {
    // validate data and user combination
    if (currentUser.role === 'org_user')
        throw new Unauthorized('You do not have a permission to modify other users profiles.', 'user:modify');

    if (currentUser.role === 'sys_admin' && data.role !== 'sys_admin' && !data.organization_id)
        throw new BadRequest('User not in an system admin role must have an organization set.', 'sys_admin.required_org_id');

    if (currentUser.role === 'org_admin') {
        if (data.organization_id !== undefined || data.role === 'sys_admin')
            throw new Unauthorized(
                'You do not have a permission to create user in other organization or in a higher role than yourself.',
                'user:modify:role_higher_than_current'
            );

        const userDetailOrg = await getOrganizationByUserId(currentUser.id);

        if (!userDetailOrg || !userDetailOrg.organization)
            throw new Error('Invalid user profile found.');

        data.organization_id = userDetailOrg.organization.id;
    }

    if (id !== null) {
        const existingUser = await getUserById(id, currentUser);

        if (existingUser.email !== data.email) {
            const userByEmail = await findUserByEmail(data.email);

            if (userByEmail !== null)
                throw new BadRequest('User with the given email address already exists.', 'user.duplicate_email');

            // invalidate all reset password requests and generate new one if the user does not have a password set yet
            await disableUsersResetPasswordRequest(existingUser.id);

            if (existingUser.password_hash === null) {
                // send the invitation with link to set the password
                const { request: resetRequest, code } = await createResetPasswordRequest({ email: existingUser.email }, true);
                const emailResult = existingUser.role === 'sys_admin'
                    ? await sendGeneralInviteEmail(existingUser.email, {
                        name: existingUser.name,
                        link: generateResetPasswordLink(resetRequest.id, code, true)
                    })
                    : await sendOrganizationInviteEmail(existingUser.email, {
                        name: existingUser.name,
                        link: generateResetPasswordLink(resetRequest.id, code, true),
                        organizationName: existingUser.organization?.name ?? ''
                    })
                ;
            }
        }

        const updatedUser = await updateUserProfile(data, existingUser.id);

        return {
            ...existingUser,
            ...updatedUser
        }
    }

    const user = await insertUser(data);
    const userDetail = await getUserById(user.id, currentUser);

    // send the invitation with link to set the password
    const { request: resetRequest, code } = await createResetPasswordRequest({ email: user.email }, true);
    const emailResult = userDetail.role === 'sys_admin'
        ? await sendGeneralInviteEmail(userDetail.email, {
            name: userDetail.name,
            link: generateResetPasswordLink(resetRequest.id, code, true)
        })
        : await sendOrganizationInviteEmail(userDetail.email, {
            name: userDetail.name,
            link: generateResetPasswordLink(resetRequest.id, code, true),
            organizationName: userDetail.organization?.name ?? ''
        })
    ;

    return userDetail;
}

/**
 * Toggles user's active state.
 * @param id The user to activate or deactivate.
 * @param currentUser The current user deactivating or activating the user's profile.
 * @param isDeactivate Whether the user profile should be deactivated. This means that when false, user's profile will be activated.
 */
export async function toggleUser(id: number, currentUser: TAuthenticatedUser, isDeactivate: boolean = true): Promise<TUserWithOrganization> {
    const user = await getUserById(id, currentUser);

    if (currentUser.role === 'org_user' || currentUser.id === id)
        throw new Unauthorized("Prohibited to modify own active state.", 'user:update-own-active-state');

    const updatedUser = await softDeleteUser(id, isDeactivate);

    return {
        ...user,
        deleted_at: updatedUser.deleted_at
    }
}