import {TPaginatedResult} from "../model/pagination.model";
import {shelfDevice, TShelfDevice} from "../db/schema/device";
import {
    countShelfDevicesByFilter,
    deleteDevice,
    findDeviceById,
    findDeviceBySerial, findShelfDevices, insertDevice,
    TShelfDeviceWithDetail, TShelfDeviceWithShelf, updateDevice
} from "../repository/device.repository";
import {NotFound} from "../error/not-found.error";
import {BadRequest} from "../error/bad-request.error";
import {TDeviceData, TListDeviceQuery} from "../model/device.model";
import {and, ilike, SQL} from "drizzle-orm";
import {countProductDiscountsByFilter} from "../repository/product-discount.repository";

/**
 * Lists devices, with the possibility to filter them.
 */
export async function listDevices(filters: TListDeviceQuery): Promise<TPaginatedResult<TShelfDeviceWithShelf>> {
    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;
    const sqlFilters: Array<SQL> = [];

    if (filters.serial_number !== undefined) sqlFilters.push(ilike(shelfDevice.serial_number, `%${filters.serial_number}%`));

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