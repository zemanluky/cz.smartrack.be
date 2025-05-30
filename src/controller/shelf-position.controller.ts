import Elysia, {t} from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    listShelfPositionLogsQuery, shelfPositionAssignNodeSlotData,
    shelfPositionData,
    shelfPositionLogItem,
    shelfPositionProductData,
    shelfPositionResponse
} from "../model/shelf-position.model";
import {paginatedResponse} from "../model/pagination.model";
import {
    assignNodeSlotToShelfPosition,
    assignProductToShelfPosition,
    createShelfPosition,
    getShelfPositionDetail, listShelfPositionLogs,
    removeShelfPosition, updateShelfPositionConfig
} from "../service/shelf-position.service";
import {transformShelfPositionDetail, transformShelfPositionLog} from "../util/transformers/shelf-position.transformer";

export const shelfPositionController = new Elysia({ prefix: '/shelf/:id/shelf-position', tags: ['Shelf Position'] })
    .use(authPlugin)
    .guard({
        params: t.Object({ id: t.Number({ description: 'ID of the parent shelf.' }) }),
        authUser: EAuthRequirement.Required,
        authDevice: EAuthRequirement.Denied
    })
    .post('/', async ({ params, body, set }) => {
        const createdShelfPosition = await createShelfPosition(body, params.id);
        set.status = 201;
        return transformShelfPositionDetail(createdShelfPosition);
    }, {
        body: shelfPositionData,
        detail: { description: 'Creates new shelf position under a given shelf.' },
        response: {
            201: shelfPositionResponse
        }
    })
    .guard({
        params: t.Object({
            id: t.Number({ description: 'ID of the parent shelf.' }),
            positionIdOrTag: t.String({ description: 'Internal ID of the position, or NFC tag\'s value.'})
        }),
    }, (guardedController) => guardedController
        .derive(({ params }) => {
            const shelfPositionId = Number(params.positionIdOrTag);

            if (Number.isNaN(shelfPositionId))
                return { shelfIdPair: [params.id, params.positionIdOrTag] };

            return { shelfIdPair: [params.id, shelfPositionId] };
        })
        .get('/:positionIdOrTag', async ({ shelfIdPair, user }) => {
            const shelfPosition = await getShelfPositionDetail(shelfIdPair, user!);
            return transformShelfPositionDetail(shelfPosition);
        }, {
            detail: { description: 'Gets detail of a given shelf position. Returns the assigned product and most recent logs as well.' },
            response: {
                200: shelfPositionResponse
            }
        })
        .put('/:positionIdOrTag', async ({ shelfIdPair, body }) => {
            const updatedPosition = await updateShelfPositionConfig(body, shelfIdPair);
            return transformShelfPositionDetail(updatedPosition);
        }, {
            body: shelfPositionData,
            detail: { description: 'Updates all information about a given shelf position. Available only to system administrators.' },
            response: {
                200: shelfPositionResponse
            }
        })
        .delete('/:positionIdOrTag', async ({ shelfIdPair }) => {
            await removeShelfPosition(shelfIdPair);
        }, {
            detail: { description: 'Deletes a shelf position. Available only to system administrators.' },
            response: {
                204: t.Undefined()
            }
        })
        .patch('/:positionIdOrTag/product', async ({ body, user, shelfIdPair }) => {
            const updatedPosition = await assignProductToShelfPosition(body, user!, shelfIdPair);
            return transformShelfPositionDetail(updatedPosition);
        }, {
            body: shelfPositionProductData,
            detail: { description: 'Assigns a product to existing shelf position. This endpoint is basically stripped down version of PUT endpoint, however it is available to the store workers.' },
            response: {
                200: shelfPositionResponse
            }
        })
        .patch('/:positionIdOrTag/node-slot', async ({ body, user, shelfIdPair }) => {
            const updatedPosition = await assignNodeSlotToShelfPosition(body, user!, shelfIdPair);
            return transformShelfPositionDetail(updatedPosition);
        }, {
            body: shelfPositionAssignNodeSlotData,
            detail: { description: 'Assigns or unassigns one slot of a node device to this shelf position.' },
            response: {
                200: shelfPositionResponse
            }
        })
        .get('/:positionIdOrTag/log', async ({ query, shelfIdPair, user }) => {
            const {metadata, items} = await listShelfPositionLogs(shelfIdPair, user!, query);
            return {
                metadata,
                items: items.map(i => transformShelfPositionLog(i))
            }
        }, {
            query: listShelfPositionLogsQuery,
            detail: { description: 'Lists stock history logs fro a given shelf position.' },
            response: paginatedResponse(shelfPositionLogItem)
        })
    )
;