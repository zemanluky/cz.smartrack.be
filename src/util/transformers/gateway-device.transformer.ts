import {TGatewayDeviceDetailResponse, TGatewayDeviceResponse} from "../../model/gateway-device.model";
import {
    TGatewayDeviceWithNodeCount,
    TGatewayDeviceWithDetail,
} from "../../repository/gateway-device.repository";
import * as R from 'remeda';

/**
 * Transforms device to response.
 * @param device
 */
export function transformGatewayDevice(device: TGatewayDeviceWithNodeCount): TGatewayDeviceResponse {
    return R.omit(device, ['device_secret']);
}

/**
 * Transforms device detail data to response.
 * @param gatewayDeviceWithNodes retrieved data from database to transform.
 */
export function transformGatewayDeviceDetail(gatewayDeviceWithNodes: TGatewayDeviceWithDetail): TGatewayDeviceDetailResponse {
    return {
        ...R.omit(gatewayDeviceWithNodes, ['device_secret']),
        number_of_nodes: gatewayDeviceWithNodes.shelf_positions_devices.length,
        node_devices: gatewayDeviceWithNodes.shelf_positions_devices.map(i => R.omit(i, ['gateway_device_id'])),
    }
}