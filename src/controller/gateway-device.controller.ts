import Elysia, {t} from "elysia";
import {authPlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {
    gatewayDeviceData,
    gatewayDeviceDetailResponse,
    gatewayDeviceResponse,
    gatewayDeviceSerialExistsResponse,
    listGatewayDevicesQuery
} from "../model/gateway-device.model";
import {
    getGatewayDeviceById,
    verifyGatewayDeviceExists,
    removeGatewayDevice,
    listGatewayDevices,
    createGatewayDevice,
    replaceGatewayDevice
} from "../service/gateway-device.service";
import {transformGatewayDevice, transformGatewayDeviceDetail} from "../util/transformers/gateway-device.transformer";
import {errorResponse} from "../model/error.model";
import {paginatedResponse} from "../model/pagination.model";

export const gatewayDeviceController = new Elysia({ prefix: '/gateway-device', tags: ['Device'] })
    .use(authPlugin)
    .guard({ authUser: EAuthRequirement.Required })
    .get('/', async ({ query }) => {
        const { metadata, items } = await listGatewayDevices(query);
        return {
            metadata,
            items: items.map(i => transformGatewayDevice(i))
        }
    }, {
        query: listGatewayDevicesQuery,
        detail: { description: 'Lists registered gateway devices.' },
        response: {
            200: paginatedResponse(gatewayDeviceResponse)
        }
    })
    .post('/', async ({ body, set }) => {
        const createdDevice = await createGatewayDevice(body);
        set.status = 201;
        return transformGatewayDeviceDetail(createdDevice);
    }, {
        body: gatewayDeviceData,
        detail: { description: 'Adds a gateway device.' },
        response: {
            201: gatewayDeviceDetailResponse
        }
    })
    .get('/serial-availability', async ({ query }) => ({
        existing_device: await verifyGatewayDeviceExists(query.serial)
    }), {
        detail: { description: 'Returns whether a gateway device with given serial number already exists.' },
        query: t.Object({ serial: t.String() }),
        response: {
            200: gatewayDeviceSerialExistsResponse
        }
    })
    .guard({ params: t.Object({ id: t.Number() }) })
    .get('/:id', async ({ params }) => {
        const device = await getGatewayDeviceById(params.id);
        return transformGatewayDeviceDetail(device);
    }, {
        detail: { description: 'Retrieves gateway device by its ID.' },
        response: {
            200: gatewayDeviceDetailResponse
        }
    })
    .put('/:id', async ({ params, body }) => {
        const updatedDevice = await replaceGatewayDevice(body, params.id);
        return transformGatewayDeviceDetail(updatedDevice);
    }, {
        body: gatewayDeviceData,
        detail: { description: 'Updates gateway device data. Essentially, replaces current gateway device while keeping its ID. This might be useful when replacing a broken device with already connected node devices.' },
        response: {
            200: gatewayDeviceDetailResponse
        }
    })
    .delete('/:id', async ({ params }) => await removeGatewayDevice(params.id), {
        detail: { description: 'Deletes a gateway device by its ID. The device cannot be deleted if node devices are still assigned to communicate through this gateway.' },
        response: {
            204: t.Undefined(),
            400: errorResponse,
            404: errorResponse,
            500: errorResponse
        }
    })
;