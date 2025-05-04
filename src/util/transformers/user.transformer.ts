import {TUserWithOrganization} from "../../repository/user.repository";
import {TUserProfileResponse, TUserResponse} from "../../model/user.model";
import * as R from 'remeda';

/**
 * Transforms user retrieved from database into user detail response.
 * @param user
 */
export function transformUser(user: TUserWithOrganization): TUserResponse {
    return {
        ...R.omit(user, ['deleted_at', 'password_hash', 'organization_id']),
        active: user.deleted_at === null
    };
}

/**
 * Transforms user retrieved from database into user's own profile response.
 * @param user
 */
export function transformUserProfile(user: TUserWithOrganization): TUserProfileResponse {
    return R.omit(transformUser(user), ['active']);
}