import {t} from "elysia";
import {paginationWithSortingQuery} from "./pagination.model";

/** Validation for list organizations endpoint */
export const organizationListFilters = t.Composite([
    paginationWithSortingQuery(['name']),
    t.Partial(t.Object({
        name: t.String({ description: 'Filters organization by name.' }),
        active: t.Boolean({ description: 'Filters active (true), disabled (false) or both active and disabled organizations.'})
    }))
]);
export type TOrganizationListQuery = typeof organizationListFilters.static;

export const organizationData = t.Object({
    name: t.String({ min: 3, max: 255, description: 'Name of the organization.' }),
    active: t.Optional(t.Boolean({ default: true, description: 'Whether the users under the organization can log-in.' })),
});
export type TOrganizationData = typeof organizationData.static;

export const organizationResponse = t.Object({
    id: t.Number({ description: 'ID of the organization.'}),
    name: t.String({ description: 'Name of the organization.' }),
    active: t.Boolean({ description: 'Whether the users under the organization can log-in.' }),
});