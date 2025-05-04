import Elysia, {t} from "elysia";
import {authUserPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {listUsersQuery, saveUserData, userResponse} from "../model/user.model";
import {paginatedResponse} from "../model/pagination.model";
import {getUserById, listUsers, saveUser, toggleUser} from "../service/user.service";
import {transformUser} from "../util/transformers/user.transformer";

export const userController = new Elysia({ prefix: '/user', tags: ['User'] })
    .use(authUserPlugin)
    .guard({ authUser: EAuthRequirement.Required })
    .get('/', async ({ user, query }) => {
        const { metadata, items } = await listUsers(query, user!);

        return {
            metadata,
            items: items.map(i => transformUser(i))
        };
    }, {
        query: listUsersQuery,
        detail: { description: "Lists users for the current user's organization, or all users using SmartRack when the user calling this endpoint is a system admin." },
        response: {
            200: paginatedResponse(userResponse)
        }
    })
    .post('/', async ({ body, user, set }) => {
        const userProfile = await saveUser(body, user!);

        set.status = 201;
        return transformUser(userProfile);
    }, {
        body: saveUserData,
        detail: { description: 'Creates new user. Either lets system admins create new admins, or users for a given organization. It also lets organization admins create additional users within their org.' },
        response: {
            201: userResponse
        }
    })
    .guard({ params: t.Object({ id: t.Number() }) })
    .get('/:id', async ({ user, params }) => {
        const userProfile = await getUserById(params.id, user!);
        return transformUser(userProfile);
    }, {
        detail: { description: 'Retrieves a user by their ID.' },
        response: {
            200: userResponse
        }
    })
    .put('/:id', async ({ body, user, params }) => {
        const userProfile = await saveUser(body, user!, params.id);
        return transformUser(userProfile);
    }, {
        body: saveUserData,
        detail: { description: 'Updates existing user with provided update data, such as name or email.' },
        response: {
            200: userResponse
        }
    })
    .delete('/:id', async ({ user, params }) => {
        const userProfile = await toggleUser(params.id, user!);
        return transformUser(userProfile);
    }, {
        detail: { description: "Deactivates given user's profile." },
        response: {
            200: userResponse
        }
    })
    .patch('/:id/active-status', async ({ user, params }) => {
        const userProfile = await toggleUser(params.id, user!, false);
        return transformUser(userProfile);
    }, {
        detail: { description: "Restores given user's account to active." },
        response: {
            200: userResponse
        }
    })
;