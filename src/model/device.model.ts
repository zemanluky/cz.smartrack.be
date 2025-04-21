import {t} from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";

export const listDevicesQuery = t.Composite([
    paginationWithSortingQuery(['serial_number', 'last_connected', 'current_battery_percent']),
    t.Partial(t.Object({
        serial_number: t.String({ description: 'Searches for devices by their serial number containing part of the given search query.' }),
        battery_percent_min: t.Number({ minimum: 0, maximum: 100, description: 'Filters devices with current battery percentage higher than filter value.' }),
        battery_percent_max: t.Number({ minimum: 0, maximum: 100, description: 'Filters devices with current battery percentage lower than filter value.' }),
        last_connected_min: t.Date({ description: 'Filters devices connected later than filter value.' }),
        last_connected_max: t.Date({ description: 'Filters devices connected before than filter value.' }),
    }))
]);
export type TListDeviceQuery = typeof listDevicesQuery.static;

export const deviceData = t.Object({
    serial_number: t.String({ minLength: 3, maxLength: 255, description: 'The serial number of the parent device.' }),
    device_secret: t.String({ minLength: 32, maxLength: 64, description: 'The secret to register the device with. Basically a strong password that is securely stored on the device\'s security module.' }),
});
export type TDeviceData = typeof deviceData.static;

export const deviceResponse = t.Object({
    id: t.Number({ description: 'Internal ID of the device.' }),
    serial_number: t.String({ description: 'The serial number of the device.' }),
    current_battery_percent: t.Nullable(t.Number({ minimum: 0, maximum: 100, description: 'Indicates current battery state of the device, if the device has reported it at least once.' })),
    last_connected: t.Nullable(t.Date({ description: 'The last time the device got connected and reported being available to the API.' })),
    shelf: t.Nullable(t.Number())
});
export type TDeviceResponse = typeof deviceResponse.static;

export const deviceDetailResponse = t.Composite([
    deviceResponse,
    t.Object({
        latest_statuses: t.Array(t.Object({
            timestamp: t.Date({ description: 'The time at which the status of the device was recorded.' }),
            battery_percent: t.Number({ minimum: 0, maximum: 100, description: 'The battery state of the device at a given point in time.' }),
        })),
    })
]);
export type TDeviceDetailResponse = typeof deviceDetailResponse.static;

export const deviceSerialExistsResponse = t.Object({
    existing_device: t.Union([t.Literal(false), t.Number()], { description: 'False when there is no device with the same serial number, otherwise ID of already existing device.' })
});
export type TDeviceSerialExistResponse = typeof deviceSerialExistsResponse.static;

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

export const deviceStatusData = t.Object({
    current_battery: t.Number({ min: 0, max: 100, description: 'Current battery status in percent.' })
});
export type TDeviceStatusData = typeof deviceStatusData.static;

export const deviceStatusResponse = t.Object({
    id: t.Number(),
    timestamp: t.Date({ description: 'The date and time at which the status was recorded.' }),
    battery_percent: t.Number({ minimum: 0, maximum: 100, description: 'The battery status of the device at the time this entry was recorded.' })
});
export type TDeviceStatusResponse = typeof deviceStatusResponse.static;