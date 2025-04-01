import {drizzle} from "drizzle-orm/bun-sql";

export const db = drizzle({
    connection: Bun.env.DATABASE_URI!,
    casing: 'snake_case'
});