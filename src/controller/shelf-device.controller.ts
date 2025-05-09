import Elysia, { t } from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    assignNfcTagData,
    deviceStatusResponse,
    listDeviceStatusLogsQuery,
    shelfDeviceDetailResponse
} from "../model/shelf-device.model";
import {paginatedResponse} from "../model/pagination.model";
import {assignNfcTagToDevice, getShelfDeviceById, listShelfDeviceStatusLogs} from "../service/shelf-device.service";
import {transformShelfDeviceDetail} from "../util/transformers/shelf-device.transformer";

export const shelfDeviceController = new Elysia({ prefix: '/shelf-device', tags: ['Shelf Device'] })
    .use(authPlugin)
    .guard({
        authDevice: EAuthRequirement.Denied,
        authUser: EAuthRequirement.Required,
    })
    .guard({ params: t.Object({ id: t.Number() }) }, (guardedRoutes) => guardedRoutes
        .get('/:id', async ({ params }) => {
            const device = await getShelfDeviceById(params.id);
            return transformShelfDeviceDetail(device);
        }, {
            detail: {description: 'Gets detail of a given shelf device. This returns recent logs, the current status and slots and their status.'},
            response: {
                200: shelfDeviceDetailResponse
            }
        })
        .get('/:id/logs', async ({ params, query }) => {
            return await listShelfDeviceStatusLogs(params.id, query);
        }, {
            query: listDeviceStatusLogsQuery,
            detail: { description: 'Returns a paginated result set with status logs of a given shelf device.' },
            response: {
                200: paginatedResponse(deviceStatusResponse)
            }
        })
    )
    .guard({ params: t.Object({ pairingCode: t.String() }) }, (guardedInstance) => guardedInstance
        .patch('/:id/nfc', async ({ body, params }) => {
            const device = await assignNfcTagToDevice(body, params.pairingCode);
            return transformShelfDeviceDetail(device);
        }, {
            body: assignNfcTagData,
            detail: { description: 'Allows the user to assign a NFC tag on the shelf to a given shelf device.' },
            response: {
                200: shelfDeviceDetailResponse
            }
        })
    )
;
