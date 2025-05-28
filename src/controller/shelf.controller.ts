import Elysia, {t} from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    listShelvesQuery,
    shelfData,
    shelfDetailResponse,
    shelfListItemResponse
} from "../model/shelf.model";
import {paginatedResponse} from "../model/pagination.model";
import {getShelfById, listShelves, removeShelf, saveShelf} from "../service/shelf.service";
import {transformShelf, transformShelfDetail} from "../util/transformers/shelf.transformer";

export const shelfController = new Elysia({ prefix: '/shelf', tags: ['Shelf'] })
    .use(authPlugin)
    .guard({ authDevice: EAuthRequirement.Denied, authUser: EAuthRequirement.Required })
    .get('/', async ({ user, query }) => {
        const { metadata, items } = await listShelves(user!, query);

        return {
            metadata,
            items: items.map(i => transformShelf(i, user!))
        }
    }, {
        query: listShelvesQuery,
        detail: { description: 'Gets a list of shelves for the current organization. It also can retrieve shelves of a specified organization if used by system admin.' },
        response: {
            200: paginatedResponse(shelfListItemResponse)
        }
    })
    .post('/', async ({ user, body, set }) => {
        const createdShelf = await saveShelf(body, user!);
        set.status = 201;

        return transformShelfDetail(createdShelf, user!);
    }, {
        body: shelfData,
        response: {
            201: shelfDetailResponse
        }
    })
    .guard({ params: t.Object({ id: t.Number() }) })
    .get('/:id', async ({ params, user }) => {
        const shelf = await getShelfById(params.id, user!);
        return transformShelfDetail(shelf, user!);
    }, {
        detail: { description: 'Gets detail of a given shelf. This endpoint returns data based on the role of the user.' },
        response: {
            200: shelfDetailResponse
        }
    })
    .put('/:id', async ({ params, user, body }) => {
        const updatedShelf = await saveShelf(body, user!, params.id);

        return transformShelfDetail(updatedShelf, user!);
    }, {
        body: shelfData,
        detail: { description: 'Updates shelf data by ID. Available for system administrators only.' },
        response: {
            200: shelfDetailResponse
        }
    })
    .delete('/:id', async ({ params, user, set }) => {
        await removeShelf(params.id, user!);
        set.status = 204;
    }, {
        response: {
            204: t.Undefined({ description: 'Successful deletion.' })
        }
    })
;