import {count, SQL } from "drizzle-orm";
import {shelfPositionLog, TShelfPositionLogEntry, TShelfPositionLogEntryInsert} from "../db/schema/shelf";
import { db } from "../db/db";
import {getQueryOrderByConfig, TSortConfig} from "../util/database";
import {TShelfPositionWithProduct} from "./shelf.repository";
import {TShelfPositionLogWithProduct} from "./shelf-position.repository";

/**
 * Retrieves a filtered list of shelf position logs.
 * @param limit
 * @param offset
 * @param filters
 * @param sort
 */
export async function findShelfPositionLogs(
    limit: number = 25, offset: number = 0, filters: SQL|null = null, sort: TSortConfig|null = null
): Promise<Array<TShelfPositionLogWithProduct>> {
    return await db.query.shelfPositionLog.findMany({
        ...(sort !== null ? { orderBy: getQueryOrderByConfig(sort) } : {}),
        where: filters ?? undefined,
        limit, offset,
        with: {product: true}
    });
}

/**
 * Gets the number of items in database based on given filters.
 * @param filters
 */
export async function countShelfPositionLogsByFilter(filters: SQL|null = null): Promise<number> {
    const result = await db.select({ count: count() })
        .from(shelfPositionLog)
        .where(filters ?? undefined)
    ;
    return result[0].count;
}

/**
 * Inserts one or more logs.
 * @param logs Log entries to insert.
 */
export async function insertShelfPositionLogs(logs: Array<TShelfPositionLogEntryInsert>): Promise<void> {
    await db.insert(shelfPositionLog).values(logs);
}