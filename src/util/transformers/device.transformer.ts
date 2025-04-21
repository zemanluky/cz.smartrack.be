import {TDeviceDetailResponse, TDeviceResponse} from "../../model/device.model";
import {TShelfDeviceWithDetail, TShelfDeviceWithShelf} from "../../repository/device.repository";
import * as R from 'remeda';

/**
 * Transforms device to response.
 * @param device
 */
export function transformDevice(device: TShelfDeviceWithShelf): TDeviceResponse {
    return {
        ...R.omit(device, ['device_secret']),
        shelf: device.shelf?.id ?? null,
    }
}

/**
 * Transforms device detail data to response.
 * @param deviceWithLogs retrieved data from database to transform.
 */
export function transformDeviceDetail(deviceWithLogs: TShelfDeviceWithDetail): TDeviceDetailResponse {
    return {
        ...transformDevice(deviceWithLogs),
        latest_statuses: deviceWithLogs.shelf_device_status_logs,
    }
}