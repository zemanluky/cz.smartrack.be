import {t, TSchema} from "elysia";

export const paginationQuery = t.Object({
    limit: t.Number({ default: 25 }),
    page: t.Number({ default: 1 })
});

export const paginationMetadataObject = t.Object({
    page: t.Number(),
    limit: t.Number(),
    currentOffset: t.Number(),
    hasNextPage: t.Boolean(),
    totalResults: t.Number(),
    filteredResults: t.Number()
});
export type TPaginationMetadata = typeof paginationMetadataObject.static;

export function paginatedResponse(entitySchema: TSchema) {
    return t.Object({
        metadata: paginationMetadataObject,
        items: t.Array(entitySchema)
    })
}