import {boolean, char, integer, pgEnum, pgTable, serial, timestamp, varchar} from "drizzle-orm/pg-core";
import {organization} from "./organization";
import {relations, sql} from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', ['sys_admin', 'org_admin', 'org_user']);

export const user = pgTable('user', {
    id: integer().generatedAlwaysAsIdentity({ name: 'user_id_sequence' }).primaryKey(),
    organization_id: integer().references(() => organization.id, { onDelete: 'restrict', onUpdate: 'cascade' }),
    role: userRoleEnum().notNull(),
    email: varchar({ length: 255 }).notNull().unique(),
    password_hash: varchar({ length: 130 }),
    name: varchar({ length: 255 }).notNull(),
    deleted_at: timestamp()
});
export const userRelations = relations(user, ({ one, many }) => ({
    organization: one(organization, { fields: [user.organization_id], references: [organization.id] }),
    refresh_tokens: many(userRefreshToken),
    reset_password_requests: many(userResetPasswordRequest)
}));
export type TUser = typeof user.$inferSelect;
export type TUserInsert = typeof user.$inferInsert;

export const userRefreshToken = pgTable('user_refresh_token', {
    id: integer().generatedAlwaysAsIdentity({ name: 'user_refresh_token_id_sequence' }).primaryKey(),
    user_id: integer().notNull().references(() => user.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    jti: varchar({ length: 72 }).notNull(),
    created_at: timestamp().notNull().default(sql`NOW()`),
    valid_until: timestamp().notNull(),
    revoked_at: timestamp().default(sql`NULL`)
});
export const userRefreshTokenRelations = relations(userRefreshToken, ({ one, many }) => ({
    user: one(user, { fields: [userRefreshToken.user_id], references: [user.id] }),
}));
export type TUserRefreshToken = typeof userRefreshToken.$inferSelect;
export type TUserRefreshTokenInsert = typeof userRefreshToken.$inferInsert;

export const userResetPasswordRequest = pgTable('user_reset_password_request', {
    id: integer().generatedByDefaultAsIdentity({ name: 'user_reset_password_request_id_sequence'}).primaryKey(),
    user_id: integer().notNull().references(() => user.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    reset_request_code_hash: varchar({ length: 130 }).notNull(),
    valid_until: timestamp(),
    is_used: boolean().notNull().default(false)
});
export const userResetPasswordRelations = relations(userResetPasswordRequest, ({ one, many }) => ({
    user: one(user, { fields: [userResetPasswordRequest.user_id], references: [user.id] })
}));
export type TUserResetPasswordRequest = typeof userResetPasswordRequest.$inferSelect;
export type TUserResetPasswordRequestInsert = typeof userResetPasswordRequest.$inferInsert;
