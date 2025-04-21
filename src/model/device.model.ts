import {t} from "elysia";
import {organizationResponse} from "./organization.model";
import {paginationWithSortingQuery} from "./pagination.model";

export const listDevicesQuery = t.Composite([
    paginationWithSortingQuery(['serial_number', 'last_connected', 'current_battery_percent']),
    t.Partial(t.Object({
        serial_number: t.String({ description: 'Searches for devices by their serial number containing part of the given search query.' })
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
            timestamp: t.Date({ description: 'The time at which the status of the device was recorder.' }),
            battery_percent: t.Number({ minimum: 0, maximum: 100, description: 'The battery state of the device at a given point in time.' }),
        })),
    })
]);
export type TDeviceDetailResponse = typeof deviceDetailResponse.static;

export const deviceSerialExistsResponse = t.Object({
    existing_device: t.Union([t.Literal(false), t.Number()], { description: 'False when there is no device with the same serial number, otherwise ID of already existing device.' })
});
export type TDeviceSerialExistResponse = typeof deviceSerialExistsResponse.static;