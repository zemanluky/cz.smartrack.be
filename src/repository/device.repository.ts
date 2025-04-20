import {shelfDevice, TShelfDevice} from "../db/schema/device";
import {db} from "../db/db";
import {eq} from "drizzle-orm";

/**
 * Tries to find one shelf device by its serial number.
 * @param serialNumber The serial number to find the device by.
 * @returns The found shelf device, null otherwise.
 */
export async function findDeviceBySerial(serialNumber: string): Promise<TShelfDevice|null> {
    const device = await db.query.shelfDevice.findFirst({
        where: eq(shelfDevice.serial_number, serialNumber)
    });
    return device ?? null;
}