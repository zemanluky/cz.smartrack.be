import {
    shelf,
    shelfPositionLog,
    TShelf,
    TShelfPosition,
    TShelfPositionLogEntry,
    TShelfPositionLogEntryInsert
} from "../db/schema/shelf";
import {TAuthenticatedUser} from "../plugin/auth.plugin";
import {
    TListShelfPositionLogsQuery, TShelfPositionAssignNodeSlotData,
    TShelfPositionData,
    TShelfPositionProductData
} from "../model/shelf-position.model";
import {TPaginatedResult} from "../model/pagination.model";
import {
    deleteShelfPosition,
    existsShelfPositionByShelfRowColumn,
    findShelfPositionById,
    findShelfPositionByNfcTag,
    findShelfPositionIdByNfcTag,
    insertShelfPosition,
    TShelfPositionDetail,
    TShelfPositionLogWithProduct,
    updateShelfPosition
} from "../repository/shelf-position.repository";
import {NotFound} from "../error/not-found.error";
import {TOrganization} from "../db/schema/organization";
import {getOrganizationByUserId} from "../repository/organization.repository";
import {Unauthenticated} from "../error/unauthenticated.error";
import {BadRequest} from "../error/bad-request.error";
import {Unauthorized} from "../error/unauthorized.error";
import {findProductById} from "../repository/product.repository";
import {findShelfById} from "../repository/shelf.repository";
import {TNodeDeviceStockData} from "../model/shelf-device.model";
import {and, eq, gte, lte, SQL} from "drizzle-orm";
import {
    countShelfPositionLogsByFilter,
    findShelfPositionLogs,
    insertShelfPositionLogs
} from "../repository/shelf-position-log.repository";
import * as R from 'remeda';
import {
    findShelfDevicePairingByPairingCode,
    updateShelfDevicePairingByPairingCode
} from "../repository/shelf-device-pairing.repository";

/** ID of the shelf and the shelf position. */
type TShelfPositionIdPair = readonly [number, number|string];

/**
 * Verifies that the user trying to create new product has an assigned organization and can create products.
 * @param userId
 * @returns The organization assigned to the given user. If the user is a sysadmin, null will be returned.
 */
async function verifyUsersOrganization(userId: number): Promise<TOrganization|null> {
    const { user, organization } = (await getOrganizationByUserId(userId)) ?? { user: null, organization: null };

    if (!user)
        throw new Unauthenticated('The currently logged-in user\'s profile could not be found.', 'invalid_credentials');

    if (!organization && user.role !== 'sys_admin')
        throw new BadRequest('Cannot manage shelf positions without an assigned organization.', 'shelf_positions:manage:required-organization');

    return organization;
}

/**
 * Retrieves detail of a given shelf position.
 * @param id ID of the shelf and the position.
 * @param user The user retrieving given shelf position.
 */
export async function getShelfPositionDetail([shelfId, shelfPositionId]: TShelfPositionIdPair, user: TAuthenticatedUser): Promise<TShelfPositionDetail> {
    const shelfPosition = typeof shelfPositionId === 'string'
        ? await findShelfPositionByNfcTag(shelfPositionId)
        : await findShelfPositionById(shelfPositionId)
    ;

    if (!shelfPosition || shelfPosition.shelf_id !== shelfId)
        throw new NotFound('The shelf position you are trying to retrieve does not exist.', 'shelf_position');

    if (
        user.role !== 'sys_admin'
        && shelfPosition.shelf.organization_id !== ((await verifyUsersOrganization(user.id)) ?? {id: null}).id
    ) {
        throw new Unauthorized('You do not have access to the specified shelf position.');
    }

    return shelfPosition;
}

/**
 * Verifies whether the combination of row and column is already assigned to a given shelf.
 * @param shelfId ID of the shelf.
 * @param column The column in the shelf.
 * @param row The row in the shelf.
 * @returns True when shelf position with given row and column already exists, false otherwise.
 */
export async function verifyShelfPositionByShelfRowColumn(shelfId: number, column: number, row: number): Promise<boolean> {
    const shelfPositionByPlacement = await existsShelfPositionByShelfRowColumn(shelfId, row, column);
    return shelfPositionByPlacement !== null;
}

/**
 * Verifies that a product can be used on a given shelf position.
 * @param productId ID of the product to verify.
 * @param shelf The parent shelf of the shelf position to which the product should be assigned.
 * @returns Nothing if the verification is successful. Otherwise, throws errors.
 */
async function verifyProductUsage(productId: number, shelf: TShelf): Promise<void> {
    const product = await findProductById(productId);

    if (!product)
        throw new BadRequest(
            'The product you are trying to set does not exist.',
            'shelf_position:assign-nonexistent-product'
        );

    if (product.organization_id !== shelf.organization_id)
        throw new BadRequest(
            'The product you are trying to set is from a different organization that the shelf. '
            + 'Please only assign products from the same organization as the shelf.',
            'shelf_position:product_organization_mismatch'
        );

    if (product.deleted_at !== null)
        throw new BadRequest(
            'Cannot assign a product that is currently archived. Please, unarchive the product or assign a different one.',
            'shelf_position:assign-deleted-product'
        );
}

/**
 * Creates new shelf position.
 * This service method should only be called by a system administrator.
 * @param data Data to create or update the shelf position with.
 * @param shelfId ID of the shelf to which the newly created shelf position should be assigned.
 */
export async function createShelfPosition(data: TShelfPositionData, shelfId: number): Promise<TShelfPositionDetail> {
    // verify that the parent shelf exists
    const shelf = await findShelfById(shelfId);

    if (!shelf)
        throw new BadRequest(`Cannot create new shelf position since the parent shelf with ID ${shelfId} does not exist.`);

    // verify that the same shelf position by column and row does not exist
    if (await verifyShelfPositionByShelfRowColumn(shelfId, data.column, data.row))
        throw new BadRequest(
            'Cannot create shelf position, as the provided row and column are already assigned to a different position within current shelf.',
            'shelf_position:duplicate-row-column'
        );

    // verify that the product may be assigned
    if (data.product_id)
        await verifyProductUsage(data.product_id, shelf);

    const newShelfPosition = await insertShelfPosition({
        shelf_id: shelfId,
        ...data
    });

    return await findShelfPositionById(newShelfPosition.id) as TShelfPositionDetail;
}

/**
 * Updates existing shelf position.
 * This service method should only be called when the user is a system administrator.
 * @param data
 * @param id
 */
export async function updateShelfPositionConfig(
    data: TShelfPositionData, [shelfId, shelfPositionId]: TShelfPositionIdPair
): Promise<TShelfPositionDetail> {
    const shelfPosition = typeof shelfPositionId === 'string'
        ? await findShelfPositionByNfcTag(shelfPositionId)
        : await findShelfPositionById(shelfPositionId)
    ;

    if (!shelfPosition || shelfPosition.shelf_id !== shelfId)
        throw new NotFound('The shelf position you are trying to update does not exist.', 'shelf_position');

    // verify changes which are constrained by the unique index
    if ((shelfPosition.column !== data.column || shelfPosition.row !== data.row)
        && await verifyShelfPositionByShelfRowColumn(shelfPosition.shelf_id, data.column, data.row)
    ) {
        throw new BadRequest(
            'Cannot update given shelf position, as the provided row and column are already assigned to a different position within current shelf.',
            'shelf_position:duplicate-row-column'
        );
    }

    // verify that the product is within the organization
    if (shelfPosition.product_id !== data.product_id && data.product_id !== null)
        await verifyProductUsage(data.product_id, shelfPosition.shelf);

    await updateShelfPosition(data, shelfPosition.id);
    return await findShelfPositionById(shelfPosition.id) as TShelfPositionDetail;
}

/**
 * Assigns product to existing shelf position.
 * @param data Data to assign the product.
 * @param user User assigning the product.
 * @param id ID of the shelf and the position.
 */
export async function assignProductToShelfPosition(
    data: TShelfPositionProductData, user: TAuthenticatedUser, id: TShelfPositionIdPair
): Promise<TShelfPositionDetail> {
    const shelfPositionId = typeof id[1] === 'string' ? await findShelfPositionIdByNfcTag(id[1]) : id[1];

    if (!shelfPositionId)
        throw new NotFound('The shelf position you are trying to update does not exist.', 'shelf_position');

    const shelfPosition = await getShelfPositionDetail([id[0], shelfPositionId], user);

    // verify that the user has access to the product
    if (shelfPosition.product_id !== data.product_id && data.product_id !== null)
        await verifyProductUsage(data.product_id, shelfPosition.shelf);

    const updatedShelfPosition = await updateShelfPosition(data, shelfPosition.id);

    return await findShelfPositionById(updatedShelfPosition.id) as TShelfPositionDetail;
}

/**
 * Assigns shelf position to a specified node slot.
 * @param data Data to assign the slot.
 * @param user User assigning the slot.
 * @param id ID of the shelf and the position.
 */
export async function assignNodeSlotToShelfPosition(
    data: TShelfPositionAssignNodeSlotData, user: TAuthenticatedUser, id: TShelfPositionIdPair
): Promise<TShelfPositionDetail> {
    const shelfPosition = await getShelfPositionDetail(id, user);

    // we are unassigning the position from the slot, check
    if (data.pairing_code === null) {
        if (shelfPosition.pairing !== null) {
            await updateShelfDevicePairingByPairingCode(shelfPosition.pairing.pairing_code, { shelf_position_id: null });
            return {...shelfPosition, pairing: null};
        }

        return shelfPosition;
    }

    // verify that the slot exists
    const pairing = await findShelfDevicePairingByPairingCode(data.pairing_code);

    if (!pairing)
        throw new BadRequest('The slot device with the given pairing code does not exist.', 'shelf_position:slot_device_missing');

    const updatedPairing = await updateShelfDevicePairingByPairingCode(pairing.pairing_code, { shelf_position_id: shelfPosition.id });
    return {...shelfPosition, pairing: updatedPairing};
}

/**
 * Permanently deletes a given shelf position.
 * This method should only be used by system administrators.
 * @param id ID of the shelf and the position.
 */
export async function removeShelfPosition([shelfId, shelfPositionId]: TShelfPositionIdPair): Promise<void> {
    const shelfPosition = typeof shelfPositionId === 'string'
        ? await findShelfPositionByNfcTag(shelfPositionId)
        : await findShelfPositionById(shelfPositionId)
    ;

    if (!shelfPosition || shelfPosition.shelf_id !== shelfId)
        throw new NotFound('The shelf position you are trying to delete does not exist.', 'shelf_position');

    await deleteShelfPosition(shelfPosition.id);
}

/**
 * Lists logs of a given shelf position with the possibility to apply more filters.
 * @param id ID of the shelf and the shelf position to retrieve logs for.
 * @param user User accessing the logs.
 * @param filters Additional filters.
 */
export async function listShelfPositionLogs(
    id: TShelfPositionIdPair, user: TAuthenticatedUser, filters: TListShelfPositionLogsQuery = { limit: 25, page: 1 }
): Promise<TPaginatedResult<TShelfPositionLogWithProduct>> {
    const shelfPosition = await getShelfPositionDetail(id, user);

    const zeroIndexedPage = filters.page - 1;
    const offset = zeroIndexedPage * filters.limit;

    const sqlFilters: Array<SQL> = [eq(shelfPositionLog.shelf_position_id, shelfPosition.id)];

    if (filters.product_id) sqlFilters.push(eq(shelfPositionLog.product_id, filters.product_id));
    if (filters.timestamp_min !== undefined) sqlFilters.push(gte(shelfPositionLog.timestamp, filters.timestamp_min));
    if (filters.timestamp_max !== undefined) sqlFilters.push(lte(shelfPositionLog.timestamp, filters.timestamp_max));

    const sqlFilter = and(...sqlFilters);
    const results = await findShelfPositionLogs(
        filters.limit, offset, sqlFilter, [filters.sort ?? 'desc', filters.sort_by ?? 'timestamp']
    );

    const filteredResultsCount = await countShelfPositionLogsByFilter(sqlFilter);

    return {
        metadata: {
            limit: filters.limit,
            page: filters.page,
            current_offset: offset,
            has_next_page: filteredResultsCount >= (filters.page * filters.limit),
            total_results: await countShelfPositionLogsByFilter(),
            filtered_total_results: filteredResultsCount
        },
        items: results
    }
}

export type TStockStatusData = Array<{ shelfPositionId: number, entries: Array<Omit<TNodeDeviceStockData[0],'slot_index'>> }>;

/**
 * Updates current stock status of shelf positions and saves the information to the positions' logs.
 * @param data Key-value pairs, where the key is the ID of the shelf position and the value the logs to push.
 */
export async function pushStockStatus(data: TStockStatusData): Promise<void> {
    for (const { shelfPositionId, entries } of data) {
        const shelfPosition = await findShelfPositionById(shelfPositionId);

        if (!shelfPosition)
            throw new Error('The shelf position to push the log items to does not exist even though it should.');

        if (shelfPosition.product_id === null) continue;

        await insertShelfPositionLogs(R.map(entries, (logValue): TShelfPositionLogEntryInsert => ({
            shelf_position_id: shelfPosition.id,
            product_id: shelfPosition.product_id!,
            amount_percent: logValue.current_stock_percent,
            timestamp: logValue.timestamp
        })))
    }
}