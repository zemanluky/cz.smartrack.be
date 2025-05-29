import Elysia, { t } from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    batchNodeDeviceConfigResponse,
    batchNodeDeviceStatusData, batchNodeDeviceStockStatusData, createShelfDeviceData,
    nodeDeviceConfigResponse,
    nodeDeviceStatusData, nodeDeviceStockStatusData
} from "../model/shelf-device.model";
import {logLastGatewayConnection} from "../service/gateway-device.service";
import {
    addShelfPositionsDevice,
    getBatchShelfPositionsDeviceDisplayConfig,
    getShelfPositionsDeviceDisplayConfig, pushBatchDeviceStockStatuses,
    pushBatchShelfDeviceStatuses, pushShelfDeviceStatus
} from "../service/shelf-device.service";

export const shelfDeviceIotController = new Elysia({ prefix: '/iot/shelf-device', tags: ['Shelf Device'] })
    .use(authPlugin)
    .guard({
        authDevice: EAuthRequirement.Required,
        authUser: EAuthRequirement.Denied,
    })
    .onBeforeHandle(async ({ device }) => {
        // log that the gateway device connected
        await logLastGatewayConnection(device!);
    })
    .post('/', async ({ body, device, set }) => {
        const config = await addShelfPositionsDevice(body, device!);

        set.status = 201;
        return config;
    }, {
        body: createShelfDeviceData,
        detail: { description: 'Lets the gateway device register a new shelf device connected to the gateway. This automatically opens up assignable positions in the app.'},
        response: {
            201: nodeDeviceConfigResponse
        }
    })
    .get('/config', async ({ device }) => {
        return await getBatchShelfPositionsDeviceDisplayConfig(device!);
    }, {
        detail: { description: 'Returns config for all node devices facilitated by the current gateway device. This returns possibly products config or pairing codes for the eInk displays.' },
        response: {
            200: batchNodeDeviceConfigResponse
        }
    })
    .post('/batch-status', async ({ body, device }) => {
        await pushBatchShelfDeviceStatuses(body, device!);
    }, {
        body: batchNodeDeviceStatusData,
        detail: { description: 'Lets the gateway device report status of multiple node devices at once.' },
        response: {
            204: t.Undefined()
        }
    })
    .post('/batch-stock', async ({ body, device, set }) => {
        await pushBatchDeviceStockStatuses(body, device!);
        set.status = 204;
    }, {
        body: batchNodeDeviceStockStatusData,
        detail: { description: 'Allows the gateway to push the current stock status of multiple of its slot devices at once.' },
        response: {
            204: t.Undefined()
        }
    })
    .guard({ params: t.Object({ serial: t.String({ description: 'Serial number of the node device.' }) }) })
    .get('/:serial/config', async ({ params, device }) => {
        return await getShelfPositionsDeviceDisplayConfig(params.serial, device!);
    }, {
        detail: { description: 'Returns config for a given node device. This returns possibly products config or pairing codes for the eInk display.'},
        response: {
            200: nodeDeviceConfigResponse
        }
    })
    .post('/:serial/status', async ({ params, body, device }) => {
        await pushShelfDeviceStatus(body, params.serial, device!);
    }, {
        body: nodeDeviceStatusData,
        detail: { description: 'Lets the gateway device push status of one of its managed node devices.' },
        response: {
            204: t.Undefined()
        }
    })
    .post('/:serial/stock', async ({ body, params, device, set }) => {
        await pushBatchDeviceStockStatuses({ [params.serial]: body }, device!);
        set.status = 204;
    }, {
        body: nodeDeviceStockStatusData,
        detail: { description: 'Allows the gateway to push the current stock status of one of its slot devices.' },
        response: {
            204: t.Undefined({ description: 'Successfully pushed the stock status.' })
        }
    })
;
