import {TPaginatedResult} from "../model/pagination.model";
import {gatewayDevice} from "../db/schema/device";
import {
    countGatewayDevicesByFilter,
    deleteGatewayDevice,
    findGatewayDeviceById,
    findGatewayDeviceBySerial, findGatewayDevices, insertGatewayDevice,
    TGatewayDeviceWithDetail, TGatewayDeviceWithNodeCount, updateGatewayDevice
} from "../repository/gateway-device.repository";
import {NotFound} from "../error/not-found.error";
import {BadRequest} from "../error/bad-request.error";
import {TGatewayDeviceData, TListGatewayDeviceQuery} from "../model/gateway-device.model";
import {and, gte, ilike, lte, SQL} from "drizzle-orm";
import {Unauthenticated} from "../error/unauthenticated.error";
/**
 * Lists devices, with the possibility to filter them.
 */
export async function listGatewayDevices(filters: TListGatewayDeviceQuery): Promise<TPaginatedResult<TGatewayDeviceWithNodeCount>> {
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;
    const sqlFilters: Array<SQL> = [];

    if (filters.serial_number !== undefined) sqlFilters.push(ilike(gatewayDevice.serial_number, `%${filters.serial_number}%`));
    if (filters.last_connected_min !== undefined) sqlFilters.push(gte(gatewayDevice.last_connected, filters.last_connected_min));
    if (filters.last_connected_max !== undefined) sqlFilters.push(lte(gatewayDevice.last_connected, filters.last_connected_max));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await findGatewayDevices(
        filters.limit, offset, [filters.sort ?? 'asc', filters.sort_by ?? 'id'], sqlFilter
    );

    const filteredResultsCount = await countGatewayDevicesByFilter(sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countGatewayDevicesByFilter(),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

/**
 * Gets detail of a given shelf device.
 * @param id ID of the device.
 * @returns The found device.
 */
export async function getGatewayDeviceById(id: number): Promise<TGatewayDeviceWithDetail> {
    const device = await findGatewayDeviceById(id);

    if (!device)
        throw new NotFound('The requested device could not be found.', 'shelf_device');

    return device;
}

/**
 * Checks if a device with given serial number exists or not.
 * @param serial
 */
export async function verifyGatewayDeviceExists(serial: string): Promise<number|false> {
    const device = await findGatewayDeviceBySerial(serial);
    return device !== null ? device.id : false;
}

/**
 * Creates new shelf device.
 * @param data The data to create the device with.
 * @returns The created device.
 */
export async function createGatewayDevice(data: TGatewayDeviceData): Promise<TGatewayDeviceWithDetail> {
    return insertGatewayDevice({
        serial_number: data.serial_number,
        device_secret: await Bun.password.hash(data.device_secret)
    });
}

/**
 * Updates a given shelf device. This method expects that you are replacing a broken down device with new one,
 * therefore the serial number and secret of the device both have to be different.
 * @param data The data to update the device with.
 * @param id ID of the device to update.
 * @returns The updated device.
 */
export async function replaceGatewayDevice(data: TGatewayDeviceData, id: number): Promise<TGatewayDeviceWithDetail> {
    const device = await getGatewayDeviceById(id);

    // the serial number has not changed, so let's not trigger an update
    if (device.serial_number === data.serial_number) return device;

    const areDeviceSecretsEqual = await Bun.password.verify(data.device_secret, device.device_secret);

    if (areDeviceSecretsEqual)
        throw new BadRequest(
            'When updating serial number of a device, the secret must be updated.',
            'shelf_device:replacing-with-same-secret'
        );

    return updateGatewayDevice(id, {
        serial_number: data.serial_number,
        device_secret: await Bun.password.hash(data.device_secret),
        last_connected: null
    });
}

/**
 * Deletes existing shelf device by its ID.
 * @param id The ID to find the device by.
 */
export async function removeGatewayDevice(id: number): Promise<void> {
    const device = await getGatewayDeviceById(id);

    if (device.shelf_positions_devices.length !== 0)
        throw new BadRequest(
            `Cannot remove a gateway device facilitating node devices. Please, un-assign all node devices from this gateway before proceeding.`,
            'shelf_device:delete-assigned-device'
        );

    await deleteGatewayDevice(id);
}

/**
 * Changes the last time a given device has connected to our API.
 * @param gatewayId
 */
export async function logLastGatewayConnection(gatewayId: number): Promise<void> {
    const device = await findGatewayDeviceById(gatewayId);

    if (device === null)
        throw new Unauthenticated()
}