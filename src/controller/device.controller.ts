import Elysia, {t} from "elysia";
import {authUserPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    deviceData,
    deviceDetailResponse,
    deviceResponse,
    deviceSerialExistsResponse, deviceStatusResponse,
    listDevicesQuery, listDeviceStatusLogsQuery
} from "../model/device.model";
import {
    getDeviceById,
    verifyDeviceExists,
    removeDevice,
    listDevices,
    createDevice, replaceDevice, listDeviceStatusLogs
} from "../service/device.service";
import {transformDevice, transformDeviceDetail, transformDeviceLog} from "../util/transformers/device.transformer";
import {errorResponse} from "../model/error.model";
import {paginatedResponse} from "../model/pagination.model";

export const deviceController = new Elysia({ prefix: '/device', tags: ['Device'] })
    .use(authUserPlugin)
    .guard({ authUser: EAuthRequirement.Required })
    .onBeforeHandle(({ user }) => {

    })
    .get('/', async ({ query }) => {
        const { metadata, items } = await listDevices(query);
        return {
            metadata,
            items: items.map(i => transformDevice(i))
        }
    }, {
        query: listDevicesQuery,
        detail: { description: 'Lists shelf devices.' },
        response: {
            200: paginatedResponse(deviceResponse)
        }
    })
    .post('/', async ({ body, set }) => {
        const createdDevice = await createDevice(body);
        set.status = 201;
        return transformDeviceDetail(createdDevice);
    }, {
        body: deviceData,
        detail: { description: 'Adds a shelf device.' },
        response: {
            201: deviceDetailResponse
        }
    })
    .get('/serial-availability', async ({ query }) => ({
        existing_device: await verifyDeviceExists(query.serial)
    }), {
        detail: { description: 'Returns whether a device with given serial number exists.' },
        query: t.Object({ serial: t.String() }),
        response: {
            200: deviceSerialExistsResponse
        }
    })
    .guard({ params: t.Object({ id: t.Number() }) })
    .get('/:id', async ({ params }) => {
        const device = await getDeviceById(params.id);
        return transformDeviceDetail(device);
    }, {
        detail: { description: 'Retrieves device by its ID.' },
        response: {
            200: deviceDetailResponse
        }
    })
    .put('/:id', async ({ params, body }) => {
        const updatedDevice = await replaceDevice(body, params.id);
        return transformDeviceDetail(updatedDevice);
    }, {
        body: deviceData,
        detail: { description: 'Updates device data. Essentially, replaces current device while keeping its ID. This might be useful when replacing a broken device on an already assigned shelf.' },
        response: {
            200: deviceDetailResponse
        }
    })
    .delete('/:id', async ({ params }) => await removeDevice(params.id), {
        detail: { description: 'Deletes one device by its ID. The device cannot be deleted if assigned to a shelf.' },
        response: {
            204: t.Undefined(),
            400: errorResponse,
            404: errorResponse,
            500: errorResponse
        }
    })
    .get('/:id/logs', async ({ params, query }) => {
        const { metadata, items } = await listDeviceStatusLogs(params.id, query);
        return {
            metadata,
            items: items.map(i => transformDeviceLog(i))
        }
    }, {
        query: listDeviceStatusLogsQuery,
        detail: { description: 'Retrieves status logs for a given device.' },
        response: {
            200: paginatedResponse(deviceStatusResponse)
        }
    })
;