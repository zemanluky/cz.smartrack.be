import {boolean, index, integer, pgTable, serial, varchar} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";
import {product} from "./product";
import {notification} from "./notifications";

export const organization = pgTable('organization', {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull(),
    active: boolean().notNull().default(true)
}, (table) => [
    index('org_name_idx').on(table.name)
]);

export const organizationRelations = relations(organization, ({ many }) => ({
    products: many(product),
    notifications: many(notification),
}));