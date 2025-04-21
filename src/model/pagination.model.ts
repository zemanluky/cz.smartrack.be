import {t, TSchema} from "elysia";

export const paginationQuery = t.Object({
    limit: t.Number({ default: 25, minimum: 1, maximum: 100, description: 'How many results per page should be returned.' }),
    page: t.Number({ default: 1, minimum: 1, description: 'Which page of results should be retrieved.' })
});
export const paginationWithSortingQuery = (allowSortColumn: Array<string>) => t.Composite([
    paginationQuery,
    t.Partial(t.Object({
        sort: t.Union([t.Literal('asc'), t.Literal('desc')], { description: 'Whether to sort the results by the given column in an ascending or descending manner.' }),
        sort_by: t.Union(allowSortColumn.map(col => t.Literal(col)), { description: 'The column which should be used to sort the results.' })
    }))
])

export const paginationMetadataObject = t.Object({
    page: t.Number({ description: 'Current page.' }),
    limit: t.Number({ description: 'Current limit of results per page.' }),
    current_offset: t.Number({ description: 'Current result offset. In other words, number of skipped results.' }),
    has_next_page: t.Boolean({ description: 'Whether a next page with results exists.' }),
    total_results: t.Number({ description: 'The total amount of entities, without filters applied.' }),
    filtered_total_results: t.Number({ description: 'The total amount of entities, with filters applied.' })
}, {
    description: 'Information about current result set.',
    examples: [
        { page: 3, limit: 50, current_offset: 100, has_next_page: true, total_results: 198, filtered_total_results: 156 },
    ]
});
export type TPaginationMetadata = typeof paginationMetadataObject.static;

export function paginatedResponse(entitySchema: TSchema) {
    return t.Object({
        metadata: paginationMetadataObject,
        items: t.Array(entitySchema)
    })
}
export type TPaginatedResult<TEntity> = { metadata: TPaginationMetadata, items: Array<TEntity> }