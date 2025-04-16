import {asc, desc, sql, SQL} from "drizzle-orm";

export type TSortConfig = ['asc'|'desc', string];

/**
 * Gets `orderBy` config from provided sort tuple config.
 */
export function getQueryOrderByConfig([sortDirection, sortColumn]: TSortConfig): [SQL] {
    if (sortDirection === 'asc')
        return [asc(sql.identifier(sortColumn))];

    return [desc(sql.identifier(sortColumn))];
}