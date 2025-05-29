import {
    TAssignNfcTagData, TBatchNodeDeviceConfigResponse,
    TBatchNodeDeviceStatusData, TBatchNodeDeviceStockStatusData,
    TCreateShelfDeviceData,
    TDeviceStatusData,
    TListDeviceStatusLogsQuery, TNodeDeviceConfigResponse, TSlotConfig
} from "../model/shelf-device.model";
import {TPaginatedResult} from "../model/pagination.model";
import {
    shelfPositionsDeviceLogs, TShelfDeviceStatusLog, TShelfDeviceStatusLogInsert,
    TShelfPositionsDevice, TShelfPositionsDevicePairing,
    TShelfPositionsDevicePairingInsert
} from "../db/schema/device";
import {and, gte, lte, SQL} from "drizzle-orm";
import {
    countShelfDeviceLogsByFilter,
    findShelfDeviceLogs,
    insertBatchDeviceStatus,
    insertDeviceStatus
} from "../repository/device-status.repository";
import * as R from 'remeda';
import {
    checkDeviceExistsByPairingCode,
    findShelfDeviceById, findShelfDeviceByPairingCode,
    findShelfDeviceBySerial, findShelfDeviceIdsBySerialNumbers, findShelfDevicesByGateway, insertShelfDevice,
    TShelfDeviceWithDetail, TShelfDeviceWithPairings, updateShelfDevice
} from "../repository/shelf-device.repository";
import {NotFound} from "../error/not-found.error";
import {Unauthorized} from "../error/unauthorized.error";
import {
    insertShelfDevicePairingPositions, updateShelfDevicePairingByPairingCode
} from "../repository/shelf-device-pairing.repository";
import {getGatewayDeviceById} from "./gateway-device.service";
import {BadRequest} from "../error/bad-request.error";
import { db } from "../db/db";
import {shelfDeviceController} from "../controller/shelf-device.controller";
import {pushStockStatus, TStockStatusData} from "./shelf-position.service";
import {findShelfPositionById, TShelfPositionDetail} from "../repository/shelf-position.repository";

/**
 * Gets existing shelf positions device by its serial number.
 * This method is meant to be used by gateways, as it does checks whether the gateway actually has access to the node.
 * @param serialNumber Serial number of the node device to find it by.
 * @param gatewayId ID of the authenticated gateway device.
 */
export async function getShelfDeviceBySerial(serialNumber: string, gatewayId: number): Promise<TShelfDeviceWithDetail|null> {
    const device = await findShelfDeviceBySerial(serialNumber);

    if (device !== null && device.gateway_device_id !== gatewayId)
        throw new Unauthorized('Cannot manage shelf positions device assigned to a different gateway device.', '');

    return device;
}

/**
 * Gets existing shelf positions device by its ID.
 * This method is meant to be used by users, as it does check whether the user has access to that node.
 * @param id ID of the shelf device to find it by.
 */
export async function getShelfDeviceById(id: number): Promise<TShelfDeviceWithDetail> {
    const device = await findShelfDeviceById(id);

    if (!device)
        throw new NotFound('The requested shelf device could not be found.', 'shelf_device');

    return device;
}

/**
 * Lets a Gateway device create new device which it manages.
 * @param data Data to create the device with.
 * @param gatewayId ID of the authenticated gateway device.
 */
export async function addShelfPositionsDevice(data: TCreateShelfDeviceData, gatewayId: number): Promise<TNodeDeviceConfigResponse> {
    // verify that the device does not already exist
    const existingDevice = await getShelfDeviceBySerial(data.serial_number, gatewayId);

    // return the existing device and do not throw an error, as we prefer gateway devices not having to deal with them
    if (existingDevice !== null) return { slots: await transformPairingIntoConfig(existingDevice) };

    const newDevice = await insertShelfDevice({
        ...data,
        gateway_device_id: gatewayId
    });

    const items = await Promise.all(R.pipe(
        R.range(0, data.number_of_slots),
        R.map(async (slotIndex): Promise<TShelfPositionsDevicePairingInsert> => {
            let pairingCode: string;

            do {
                pairingCode = R.randomString(8);
            }
            while ((await checkDeviceExistsByPairingCode(pairingCode)) !== null)

            return {
                shelf_positions_device_id: newDevice.id,
                slot_number: slotIndex + 1,
                pairing_code: pairingCode
            }
        }),
    ));
    const pairingPositions = await insertShelfDevicePairingPositions(items);

    return { slots: await transformPairingIntoConfig({ ...newDevice, pairings: pairingPositions }) };
}

/**
 * Transform one shelf pairing into configuration object for the node device.
 * @param device The node device's detail with pairings.
 */
async function transformPairingIntoConfig(device: TShelfDeviceWithPairings): Promise<TNodeDeviceConfigResponse['slots']> {
    const slots = await Promise.all(device.pairings.map(async (pairing): Promise<TSlotConfig & { pairingCode: string }> => {
        // check if the shelf position has a product set, add info about the product
        // or tell the device to show nothing when no product is assigned
        if (pairing.shelf_position_id !== null) {
            const shelfPosition = await findShelfPositionById(pairing.shelf_position_id) as TShelfPositionDetail;

            if (shelfPosition.product !== null) {
                // TODO: verify ongoing discount

                return {
                    pairingCode: pairing.pairing_code,
                    type: 'product',
                    product: {
                        name: shelfPosition.product.name.normalize("NFD").replace(/\p{Diacritic}/gu, ""),
                        price: shelfPosition.product.price,
                        discount: null
                    }
                }
            }

            return {
                pairingCode: pairing.pairing_code,
                type: 'none'
            }
        }

        // return pairing information
        return {
            pairingCode: pairing.pairing_code,
            type: 'pairing',
            pairing: { code: pairing.pairing_code }
        }
    }));

    return R.pipe(
        slots,
        R.mapToObj(slot => [slot.pairingCode, R.omit(slot, ['pairingCode'])])
    );
}

/**
 * Gets eInk display config for the slots of a given shelf positions device.
 * @param serialNumber Serial number to find the node device by.
 * @param gatewayId ID of the authenticated gateway device.
 */
export async function getShelfPositionsDeviceDisplayConfig(serialNumber: string, gatewayId: number): Promise<TNodeDeviceConfigResponse> {
    const device = await getShelfDeviceBySerial(serialNumber, gatewayId);

    if (!device)
        throw new NotFound('The requested device was not found. Cannot retrieve its configuration.', 'shelf_device');

    return {
        slots: await transformPairingIntoConfig(device)
    }
}

/**
 * Gets eInk display config for all node devices of a given gateway device.
 * @param gatewayId ID of the authenticated gateway device. This method will get config for all nodes assigned to this gateway.
 */
export async function getBatchShelfPositionsDeviceDisplayConfig(gatewayId: number): Promise<TBatchNodeDeviceConfigResponse> {
    const gateway = await getGatewayDeviceById(gatewayId);
    const shelfDevices = await findShelfDevicesByGateway(gateway.id);

    return R.pipe(
        await R.pipe(
            shelfDevices,
            R.map(async (shelfDevice) => {
                const pairingConfig = await transformPairingIntoConfig(shelfDevice);
                return [shelfDevice.serial_number, pairingConfig] as const;
            }),
            (promises) => Promise.all(promises)
        ),
        R.mapToObj(deviceConfig => [deviceConfig[0], { slots: deviceConfig[1] }])
    );
}

/**
 * Assigns a given NFC tag to existing shelf positions device.
 * @param data The NFC tag information.
 * @param pairingCode The pairing code of the shelf position in the physical shelf.
 */
export async function assignNfcTagToDevice(data: TAssignNfcTagData, pairingCode: string): Promise<TShelfDeviceWithDetail> {
    const device = await findShelfDeviceByPairingCode(pairingCode);

    if (!device)
        throw new NotFound('The shelf device to assign the NFC tag to does not exist - it could not be found be the pairing device.', 'shelf_device');

    const updatedPairing = await updateShelfDevicePairingByPairingCode(pairingCode, {
        nfc_tag: data.nfc_tag
    });

    return {
        ...device,
        pairings: device.pairings.reduce<TShelfPositionsDevicePairing[]>(
            (accumulator, currentPairing) => {
                const pairing = currentPairing.pairing_code === updatedPairing.pairing_code
                    ? updatedPairing
                    : currentPairing
                ;
                accumulator.push(pairing);
                return accumulator;
            }, []
        )
    }
}

/**
 * Lists log entries for a given node device.
 * @param id ID of the node device.
 * @param filters Filters & pagination parameters to select the right result set.
 */
export async function listShelfDeviceStatusLogs(id: number, filters: TListDeviceStatusLogsQuery): Promise<TPaginatedResult<TShelfDeviceStatusLog>> {
    // verify the device exists...
    const device = await getShelfDeviceById(id);

    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;
    const sqlFilters: Array<SQL> = [];

    if (filters.timestamp_min !== undefined) sqlFilters.push(gte(shelfPositionsDeviceLogs.timestamp, filters.timestamp_min));
    if (filters.timestamp_max !== undefined) sqlFilters.push(lte(shelfPositionsDeviceLogs.timestamp, filters.timestamp_max));
    if (filters.battery_percent_min !== undefined) sqlFilters.push(gte(shelfPositionsDeviceLogs.battery_percent, filters.battery_percent_min));
    if (filters.battery_percent_max !== undefined) sqlFilters.push(lte(shelfPositionsDeviceLogs.battery_percent, filters.battery_percent_max));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await findShelfDeviceLogs(
        device.id, filters.limit, offset, sqlFilter, [filters.sort ?? 'asc', filters.sort_by ?? 'id']
    );

    const filteredResultsCount = await countShelfDeviceLogsByFilter(device.id, sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countShelfDeviceLogsByFilter(device.id),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

/**
 * Updates current status (battery percentage) of a given device.
 * This method should be used by the gateway device to update status of one of its nodes.
 * @param data Status data.
 * @param serial Serial number to find the node device by.
 * @param gatewayId ID of the authenticated gateway pushing this update.
 */
export async function pushShelfDeviceStatus(data: TDeviceStatusData, serial: string, gatewayId: number): Promise<void> {
    const shelfDevice = await getShelfDeviceBySerial(serial, gatewayId);

    if (!shelfDevice)
        throw new BadRequest(
            'Could not find the device as registered device for current gateway. Please, re-register the devices before reporting their status.',
            'device_status:non_registered_devices'
        );

    // TODO: create notifications if they not exist yet

    // update last report status
    await insertDeviceStatus({
        shelf_positions_device_id: shelfDevice.id,
        battery_percent: data.current_battery,
        timestamp: data.timestamp
    });
    await updateShelfDevice(shelfDevice.id, { last_reported: new Date() });
}

/**
 * Updates current status (battery percentage) of multiple node devices at once.
 * This method should be used by the gateway device to update status of all nodes.
 * @param data Key-value pairs of data. The key is serial number of the device, while the value are the object with device status.
 * @param gatewayId ID of the authenticated gateway pushing these updated.
 */
export async function pushBatchShelfDeviceStatuses(data: TBatchNodeDeviceStatusData, gatewayId: number): Promise<void> {
    const serialNumbers = R.keys(data);
    const shelfDeviceIdMap = await findShelfDeviceIdsBySerialNumbers(serialNumbers, gatewayId);
    const foundSerialNumber = R.keys(shelfDeviceIdMap);

    if (foundSerialNumber.length !== serialNumbers.length)
        throw new BadRequest(
            `Could not find following devices as registered device for current gateway: ${foundSerialNumber.join(', ')}. `
            + 'Please, re-register the devices before reporting their status.', 'device_status:non_registered_devices'
        );

    const logItems: Array<TShelfDeviceStatusLogInsert> = Object.entries(data).map(([serialNumber, statusData]) => ({
        shelf_positions_device_id: shelfDeviceIdMap[serialNumber],
        battery_percent: statusData.current_battery,
        timestamp: statusData.timestamp
    }));

    await insertBatchDeviceStatus(logItems);
}

/**
 * Pushes stock status logs of multiple node devices at once.
 * @param data
 * @param gatewayId
 */
export async function pushBatchDeviceStockStatuses(data: TBatchNodeDeviceStockStatusData, gatewayId: number): Promise<void> {
    const serialNumbers = R.keys(data);
    const shelfDeviceIdMap = await findShelfDeviceIdsBySerialNumbers(serialNumbers, gatewayId);
    const foundSerialNumber = R.keys(shelfDeviceIdMap);

    if (foundSerialNumber.length !== serialNumbers.length)
        throw new BadRequest(
            `Could not find following devices as registered device for current gateway: ${foundSerialNumber.join(', ')}. `
            + 'Please, re-register the devices before reporting their status.', 'device_status:non_registered_devices'
        );

    for (const [serial, value] of Object.entries(data)) {
        const shelfDevice = await findShelfDeviceById(shelfDeviceIdMap[serial]) as TShelfDeviceWithDetail;

        const data = R.pipe(
            value, R.map((logItem): TStockStatusData[0]|null => {
                const pairing = R.find(
                    shelfDevice.pairings,
                    (pairing) => pairing.slot_number === logItem.slot_index
                );

                if (!pairing || pairing.shelf_position_id === null) return null;

                return {
                    shelfPositionId: pairing.shelf_position_id,
                    entries: [R.omit(logItem, ['slot_index'])]
                }
            })
        );

        await pushStockStatus(data.filter(d => d !== null));
    }
}