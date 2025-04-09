import {drizzle} from "drizzle-orm/bun-sql";
import * as deviceSchema from "./schema/device";
import * as notificationsSchema from "./schema/notifications";
import * as organizationSchema from "./schema/organization";
import * as productSchema from "./schema/product";
import * as shelfSchema from "./schema/shelf";
import * as userSchema from "./schema/user";

export const db = drizzle({
    connection: Bun.env.DATABASE_URI!,
    casing: 'snake_case',
    schema: {
        ...deviceSchema,
        ...notificationsSchema,
        ...organizationSchema,
        ...productSchema,
        ...shelfSchema,
        ...userSchema
    }
});