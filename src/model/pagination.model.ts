import {t, TSchema} from "elysia";

export const paginationQuery = t.Object({
    limit: t.Integer({ default: 25, minimum: 1, maximum: 100 }),
    page: t.Integer({ default: 1, minimum: 1 })
});
export const paginationWithSortingQuery = (allowSortColumn: Array<string>) => t.Composite([
    paginationQuery,
    t.Object({
        sort: t.Union([t.Literal('asc'), t.Literal('desc')]),
        sort_by: t.Union(allowSortColumn.map(col => t.Literal(col)))
    })
])

export const paginationMetadataObject = t.Object({
    page: t.Integer(),
    limit: t.Integer(),
    current_offset: t.Integer(),
    has_next_page: t.Boolean(),
    total_results: t.Integer(),
    filtered_total_results: t.Integer()
});
export type TPaginationMetadata = typeof paginationMetadataObject.static;

export function paginatedResponse(entitySchema: TSchema) {
    return t.Object({
        metadata: paginationMetadataObject,
        items: t.Array(entitySchema)
    })
}