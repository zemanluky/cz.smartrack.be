import {boolean, index, integer, pgTable, serial, varchar} from "drizzle-orm/pg-core";
import {relations} from "drizzle-orm";
import {product} from "./product";
import {notification} from "./notifications";
import {user} from "./user";

export const organization = pgTable('organization', {
    id: serial().primaryKey(),
    name: varchar({ length: 255 }).notNull().unique(),
    active: boolean().notNull().default(true)
});

export type TOrganization = typeof organization.$inferSelect;
export type TOrganizationInsert = typeof organization.$inferSelect;

export const organizationRelations = relations(organization, ({ many }) => ({
    users: many(user),
    products: many(product),
    notifications: many(notification)
}));