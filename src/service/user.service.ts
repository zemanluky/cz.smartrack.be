import {TUser} from "../db/schema/user";
import * as userRepository from "../repository/user.repository";
import {NotFound} from "../error/not-found.error";

/**
 * Retrieves a given user by their ID.
 * This method should be used only for the currently logged-in user, as it does not check if the
 * @param id
 * @throws
 */
export async function getIdentityById(id: number): Promise<TUser> {
    const user = await userRepository.getUserById(id);

    if (!user) throw new NotFound(`The user with ID ${id} does not exist.`, 'user');

    return user;
}