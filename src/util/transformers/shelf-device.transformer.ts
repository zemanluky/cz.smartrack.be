import {TShelfDeviceWithDetail} from "../../repository/shelf-device.repository";
import {TShelfDeviceDetailResponse} from "../../model/shelf-device.model";
import * as R from 'remeda';
import {transformGatewayDevice} from "./gateway-device.transformer";

/**
 * Transforms shelf device detail into a response form.
 * @param shelfDevice
 */
export function transformShelfDeviceDetail(shelfDevice: TShelfDeviceWithDetail): TShelfDeviceDetailResponse {
    return {
        ...R.omit(shelfDevice, ['pairings', 'status_logs']),
        slots: R.pipe(
            shelfDevice.pairings,
            R.sortBy([R.prop('slot_number'), 'asc']),
            R.map((pairing): TShelfDeviceDetailResponse['slots'][0] => ({
                ...R.pick(pairing, ['slot_number', 'pairing_code', 'shelf_position_id']),
                has_nfc_tag_paired: pairing.nfc_tag !== null
            }))
        ),
        recent_logs: R.pipe(
            shelfDevice.status_logs,
            R.map(sl => R.omit(sl, ['shelf_positions_device_id']))
        )
    }
}