import {t} from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";
import {getUnixTime} from "date-fns";
import {gatewayDeviceResponse} from "./gateway-device.model";

export const listDeviceStatusLogsQuery = t.Composite([
    paginationWithSortingQuery(['timestamp', 'battery_percent']),
    t.Partial(t.Object({
        timestamp_min: t.Date({ description: 'Filters logs entries newer than filter value.' }),
        timestamp_max: t.Date({ description: 'Filters logs entries older than filter value.' }),
        battery_percent_min: t.Number({ minimum: 0, maximum: 100, description: 'Filters devices with current battery percentage higher than filter value.' }),
        battery_percent_max: t.Number({ minimum: 0, maximum: 100, description: 'Filters devices with current battery percentage lower than filter value.' })
    }))
])
export type TListDeviceStatusLogsQuery = typeof listDeviceStatusLogsQuery.static;

export const nodeDeviceStatusData = t.Object({
    current_battery: t.Number({ min: 0, max: 100, description: 'Current battery status in percent.' }),
    timestamp: t.Date({
        maximumTimestamp: getUnixTime(new Date()) + 10, // account for some minor difference
        description: 'The date and time at which the status was reported.',
        default: new Date()
    })
});
export type TDeviceStatusData = typeof nodeDeviceStatusData.static;

export const batchNodeDeviceStatusData = t.Record(
    t.String({ description: 'Provide serial number as the key.' }),
    nodeDeviceStatusData,
    { description: 'Key-value pairs for the status of multiple node devices.' }
);
export type TBatchNodeDeviceStatusData = typeof batchNodeDeviceStatusData.static;

export const nodeDeviceStockStatusData = t.Array(t.Object({
    slot_index: t.Number({ minimum: 0, description: 'The index of the slot the node device manages.' }),
    current_stock_percent: t.Number({ minimum: 0, maximum: 100, description: 'Current stock status in percentage.' }),
    timestamp: t.Date({
        maximumTimestamp: getUnixTime(new Date()) + 10, // account for some minor difference
        description: 'The date and time at which the status was reported.',
        default: new Date()
    })
}));
export type TNodeDeviceStockData = typeof nodeDeviceStockStatusData.static;

export const batchNodeDeviceStockStatusData = t.Record(
    t.String({ description: 'Provide serial number as the key.' }),
    nodeDeviceStockStatusData,
    { description: 'Key-value pairs for the stock status of multiple node devices.' }
)
export type TBatchNodeDeviceStockStatusData = typeof batchNodeDeviceStockStatusData.static;

export const nodeDeviceItem = t.Object({
    id: t.Number({ description: 'ID of this shelf device.' }),
    serial_number: t.String({ description: 'Serial number of this shelf device.' }),
    gateway_device_id: t.Number({ description: 'ID of the gateway device facilitating this shelf device.'}),
    number_of_slots: t.Number({ description: 'Number of slots the shelf device has. In other words, number of sensors capable measuring remaining amount of product. This directly translates to available number of shelf positions assignable to this device.' }),
    current_battery_percent: t.Nullable(t.Number(), { description: 'Current charge of the battery of this shelf device.' }),
    last_reported: t.Nullable(t.Date(), { description: 'Date when the last status of this device was received.' })
});
export type TNodeDeviceItem = typeof nodeDeviceItem.static;

export const deviceStatusResponse = t.Object({
    id: t.Number(),
    timestamp: t.Date({ description: 'The date and time at which the status was recorded.' }),
    battery_percent: t.Number({ minimum: 0, maximum: 100, description: 'The battery status of the device at the time this entry was recorded.' })
});
export type TDeviceStatusResponse = typeof deviceStatusResponse.static;

export const createShelfDeviceData = t.Object({
    serial_number: t.String({ description: 'Serial number of the node (shelf device). This will identify the device when sending status messages through the gateway.' }),
    number_of_slots: t.Number({
        minimum: 1,
        description: 'Number of available slots (positions) that this node has connected. For example, when the node has two ultrasound sensors which can measure the remaining amount of product, then number of slots is 2.'
    })
});
export type TCreateShelfDeviceData = typeof createShelfDeviceData.static;

export const assignNfcTagData = t.Object({
    nfc_tag: t.String({ maxLength: 255, description: 'Read NFC tag to be assigned to the current shelf device.' })
});
export type TAssignNfcTagData = typeof assignNfcTagData.static;

export const nodeDeviceConfigResponse = t.Object({
    slots: t.Record(t.Number(), t.Object({
        type: t.Union([
            t.Literal('product', { description: 'This slot is currently assigned to a shelf position which has a product assigned to it. Show product and price details.' }),
            t.Literal('pairing', { description: 'This slot is currently in pairing mode. Show the pairing code, since it needs to be assigned to a shelf position.' }),
            t.Literal('none', { description: 'This slot is currently assigned to a shelf position which does not have a product set yet.' })
        ]),
        product: t.Optional(t.Object({
            name: t.String({ description: 'Name of the product in this slot.' }),
            price: t.Number({ description: 'Default price of the product in this slot.' }),
            discount: t.Nullable(t.Object({
                valid_until: t.Date({ description: 'The date until when the promotion is valid.' }),
                new_price: t.Number({ description: 'New price during this promotion.' }),
                discount_percent: t.Number({ description: 'Calculated percentage discount.' })
            }, { description: 'Object with currently active discount promotion, otherwise null.' }))
        }, { description: 'Object with product information when this slot has a shelf position with a product assigned to it.'})),
        pairing: t.Optional(t.Object({
            code: t.String({ description: 'Pairing code to show to better assign slot to the right shelf position.' })
        }, { description: 'Object with pairing code when this slot is not paired to any shelf position, null otherwise.' }))
    }))
});
export type TNodeDeviceConfigResponse = typeof nodeDeviceConfigResponse.static;
export type TSlotConfig = TNodeDeviceConfigResponse['slots'][0];
export type TNodeDeviceConfigResponseType = TSlotConfig['type'];

export const batchNodeDeviceConfigResponse = t.Record(t.String(), nodeDeviceConfigResponse);
export type TBatchNodeDeviceConfigResponse = typeof batchNodeDeviceConfigResponse.static;

export const shelfDeviceDetailResponse = t.Composite([
    nodeDeviceItem,
    t.Object({
        slots: t.Array(t.Object({
            slot_number: t.Number(),
            pairing_code: t.String(),
            shelf_position_id: t.Nullable(t.Number()),
            has_nfc_tag_paired: t.Boolean()
        })),
        recent_logs: t.Array(deviceStatusResponse),
        gateway_device: t.Object({
            id: t.Number({ description: 'Internal ID of the device.' }),
            serial_number: t.String({ description: 'The serial number of the device.' }),
            last_connected: t.Nullable(t.Date({ description: 'The last time the device got connected.' })),
        })
    })
]);
export type TShelfDeviceDetailResponse = typeof shelfDeviceDetailResponse.static;