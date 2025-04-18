import {t, TSchema} from "elysia";

export const paginationQuery = t.Object({
    limit: t.Number({ default: 25, minimum: 1, maximum: 100 }),
    page: t.Number({ default: 1, minimum: 1 })
});
export const paginationWithSortingQuery = (allowSortColumn: Array<string>) => t.Composite([
    paginationQuery,
    t.Optional(t.Object({
        sort: t.Union([t.Literal('asc'), t.Literal('desc')]),
        sort_by: t.Union(allowSortColumn.map(col => t.Literal(col)))
    }))
])

export const paginationMetadataObject = t.Object({
    page: t.Number(),
    limit: t.Number(),
    current_offset: t.Number(),
    has_next_page: t.Boolean(),
    total_results: t.Number(),
    filtered_total_results: t.Number()
});
export type TPaginationMetadata = typeof paginationMetadataObject.static;

export function paginatedResponse(entitySchema: TSchema) {
    return t.Object({
        metadata: paginationMetadataObject,
        items: t.Array(entitySchema)
    })
}
export type TPaginatedResult<TEntity> = { metadata: TPaginationMetadata, items: Array<TEntity> }