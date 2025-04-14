import {t} from "elysia";

/** Validation for list organizations endpoint */
export const organizationListFilters = t.Object({

});

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