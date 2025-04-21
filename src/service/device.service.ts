import {TPaginatedResult} from "../model/pagination.model";
import {shelfDevice, shelfDeviceStatusLog, TShelfDevice, TShelfDeviceStatusLog} from "../db/schema/device";
import {
    countShelfDevicesByFilter,
    deleteDevice,
    findDeviceById,
    findDeviceBySerial, findShelfDevices, insertDevice,
    TShelfDeviceWithDetail, TShelfDeviceWithShelf, updateDevice
} from "../repository/device.repository";
import {NotFound} from "../error/not-found.error";
import {BadRequest} from "../error/bad-request.error";
import {TDeviceData, TDeviceStatusData, TListDeviceQuery, TListDeviceStatusLogsQuery} from "../model/device.model";
import {and, gte, ilike, lte, SQL} from "drizzle-orm";
import {
    countShelfDeviceLogsByFilter,
    findShelfDeviceLogs,
    insertDeviceStatus
} from "../repository/device-status.repository";

/**
 * Lists devices, with the possibility to filter them.
 */
export async function listDevices(filters: TListDeviceQuery): Promise<TPaginatedResult<TShelfDeviceWithShelf>> {
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;
    const sqlFilters: Array<SQL> = [];

    if (filters.serial_number !== undefined) sqlFilters.push(ilike(shelfDevice.serial_number, `%${filters.serial_number}%`));
    if (filters.battery_percent_min !== undefined) sqlFilters.push(gte(shelfDevice.current_battery_percent, filters.battery_percent_min));
    if (filters.battery_percent_max !== undefined) sqlFilters.push(lte(shelfDevice.current_battery_percent, filters.battery_percent_max));
    if (filters.last_connected_min !== undefined) sqlFilters.push(gte(shelfDevice.last_connected, filters.last_connected_min));
    if (filters.last_connected_max !== undefined) sqlFilters.push(lte(shelfDevice.last_connected, filters.last_connected_max));

    const sqlFilter = sqlFilters.length > 0 ? and(...sqlFilters) : null;
    const results = await findShelfDevices(
        filters.limit, offset, sqlFilter, [filters.sort ?? 'asc', filters.sort_by ?? 'id']
    );

    const filteredResultsCount = await countShelfDevicesByFilter(sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countShelfDevicesByFilter(),
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
export async function getDeviceById(id: number): Promise<TShelfDeviceWithDetail> {
    const device = await findDeviceById(id);

    if (!device)
        throw new NotFound('The requested device could not be found.', 'shelf_device');

    return device;
}

/**
 * Checks if a device with given serial number exists or not.
 * @param serial
 */
export async function verifyDeviceExists(serial: string): Promise<number|false> {
    const device = await findDeviceBySerial(serial);
    return device !== null ? device.id : false;
}

/**
 * Creates new shelf device.
 * @param data The data to create the device with.
 * @returns The created device.
 */
export async function createDevice(data: TDeviceData): Promise<TShelfDeviceWithDetail> {
    return insertDevice({
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
export async function replaceDevice(data: TDeviceData, id: number): Promise<TShelfDeviceWithDetail> {
    const device = await getDeviceById(id);

    // the serial number has not changed, so let's not trigger an update
    if (device.serial_number === data.serial_number) return device;

    const areDeviceSecretsEqual = await Bun.password.verify(data.device_secret, device.device_secret);

    if (areDeviceSecretsEqual)
        throw new BadRequest(
            'When updating serial number of a device, the secret must be updated.',
            'shelf_device:replacing-with-same-secret'
        );

    return updateDevice(id, {
        serial_number: data.serial_number,
        device_secret: await Bun.password.hash(data.device_secret),
        current_battery_percent: null,
        last_connected: null
    });
}

/**
 * Deletes existing shelf device by its ID.
 * @param id The ID to find the device by.
 */
export async function removeDevice(id: number): Promise<void> {
    const device = await getDeviceById(id);

    if (device.shelf !== null)
        throw new BadRequest(
            `Cannot remove a device assigned to a shelf. The device is currently assigned to shelf with ID ${device.shelf.id}.`,
            'shelf_device:delete-assigned-device'
        );

    await deleteDevice(id);
}

/**
 * Lists log entries for a given device.
 */
export async function listDeviceStatusLogs(id: number, filters: TListDeviceStatusLogsQuery): Promise<TPaginatedResult<TShelfDeviceStatusLog>> {
    // verify the device exists...
    const device = await getDeviceById(id);

    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;
    const sqlFilters: Array<SQL> = [];

    if (filters.timestamp_min !== undefined) sqlFilters.push(gte(shelfDeviceStatusLog.timestamp, filters.timestamp_min));
    if (filters.timestamp_max !== undefined) sqlFilters.push(lte(shelfDeviceStatusLog.timestamp, filters.timestamp_max));
    if (filters.battery_percent_min !== undefined) sqlFilters.push(gte(shelfDeviceStatusLog.battery_percent, filters.battery_percent_min));
    if (filters.battery_percent_max !== undefined) sqlFilters.push(lte(shelfDeviceStatusLog.battery_percent, filters.battery_percent_max));

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
 * This method should be used by the device to update its own status.
 * @param data
 * @param id
 */
export async function pushDeviceStatus(data: TDeviceStatusData, id: number): Promise<void> {
    const device = await findDeviceById(id);

    if (!device)
        throw new Error('Cannot push new device status since the device does not exist.');

    const connectionTime = new Date();

    await updateDevice(device.id, { current_battery_percent: data.current_battery, last_connected: connectionTime });
    await insertDeviceStatus({
        shelf_device_id: id,
        battery_percent: data.current_battery,
        timestamp: connectionTime
    });
}