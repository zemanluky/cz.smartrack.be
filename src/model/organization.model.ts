import {t} from "elysia";
import {paginationQuery, paginationWithSortingQuery} from "./pagination.model";

/** Validation for list organizations endpoint */
export const organizationListFilters = t.Composite([
    t.Object({
        name: t.Optional(t.String()),
        active: t.Optional(t.Boolean())
    }),
    paginationWithSortingQuery(['name'])
]);
export type TOrganizationListQuery = typeof organizationListFilters.static;

export const organizationData = t.Object({
    name: t.String({ min: 3, max: 255 }),
    active: t.Optional(t.Boolean({ default: true })),
});
export type TOrganizationData = typeof organizationData.static;

export const organizationResponse = t.Object({
    id: t.Number(),
    name: t.String(),
    active: t.Boolean()
});