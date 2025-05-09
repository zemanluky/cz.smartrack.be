import {t} from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";
import {nodeDeviceItem} from "./shelf-device.model";

export const listGatewayDevicesQuery = t.Composite([
    paginationWithSortingQuery(['serial_number', 'last_connected']),
    t.Partial(t.Object({
        serial_number: t.String({ description: 'Searches for devices by their serial number containing part of the given search query.' }),
        last_connected_min: t.Date({ description: 'Filters devices connected later than filter value.' }),
        last_connected_max: t.Date({ description: 'Filters devices connected before than filter value.' }),
    }))
]);
export type TListGatewayDeviceQuery = typeof listGatewayDevicesQuery.static;

export const gatewayDeviceData = t.Object({
    serial_number: t.String({ minLength: 3, maxLength: 255, description: 'The serial number of the gateway device.' }),
    device_secret: t.String({ minLength: 32, maxLength: 64, description: 'The secret to register the device with. Basically a strong password that is securely stored on the gateway\'s security module.' }),
});
export type TGatewayDeviceData = typeof gatewayDeviceData.static;

export const gatewayDeviceResponse = t.Object({
    id: t.Number({ description: 'Internal ID of the device.' }),
    serial_number: t.String({ description: 'The serial number of the device.' }),
    last_connected: t.Nullable(t.Date({ description: 'The last time the device got connected.' })),
    number_of_nodes: t.Number({ description: 'Number of nodes (shelf devices) connecting through this gateway.'})
});
export type TGatewayDeviceResponse = typeof gatewayDeviceResponse.static;

export const gatewayDeviceDetailResponse = t.Composite([
    gatewayDeviceResponse,
    t.Object({
        node_devices: t.Array(t.Omit(nodeDeviceItem, ['gateway_device_id'])),
    })
]);
export type TGatewayDeviceDetailResponse = typeof gatewayDeviceDetailResponse.static;

export const gatewayDeviceSerialExistsResponse = t.Object({
    existing_device: t.Union([t.Literal(false), t.Number()], { description: 'False when there is no gateway device with the same serial number, otherwise ID of already existing device.' })
});
export type TGatewayDeviceSerialExistResponse = typeof gatewayDeviceSerialExistsResponse.static;