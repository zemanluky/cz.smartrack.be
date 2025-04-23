import {drizzle} from "drizzle-orm/bun-sql";
import schema from './schema'

export const db = drizzle({
    connection: Bun.env.DATABASE_URI!,
    casing: 'snake_case',
    schema: schema
});