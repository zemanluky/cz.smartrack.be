import {char, integer, pgEnum, pgTable, serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {organization} from "./organization";
import {relations, sql} from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', ['sys_admin', 'org_admin', 'org_user']);

export const user = pgTable('user', {
    id: serial().primaryKey(),
    organization_id: integer().notNull().references(() => organization.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    role: userRoleEnum().notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    password_hash: char({ length: 72 }).notNull(),
    name: varchar({ length: 255 }).notNull(),
});

export type TUser = typeof user.$inferSelect;
export type TUserInsert = typeof user.$inferInsert;

export const userRelations = relations(user, ({ one, many }) => ({
    organization: one(organization, { fields: [user.organization_id], references: [organization.id] }),
    refresh_tokens: many(userRefreshToken)
}));

export const userRefreshToken = pgTable('user_refresh_token', {
    id: serial().primaryKey(),
    user_id: integer().notNull().references(() => user.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    jti: char({ length: 72 }).notNull(),
    created_at: timestamp().notNull().default(sql`NOW()`),
    valid_until: timestamp().notNull(),
    revoked_at: timestamp().default(sql`NULL`)
});

export const userRefreshTokenRelations = relations(userRefreshToken, ({ one, many }) => ({
    user: one(user, { fields: [userRefreshToken.user_id], references: [user.id] }),
}));

export type TUserRefreshToken = typeof userRefreshToken.$inferSelect;
export type TUserRefreshTokenInsert = typeof userRefreshToken.$inferInsert;
