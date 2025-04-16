import Elysia, {t} from "elysia";

export const shelfController = new Elysia({ prefix: '/shelf', tags: ['Shelf'] })
    .get('/', 'List shelves for the current organization')
    .post('/', 'Create shelf for a organization - available only for admin')
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .get('/:id', 'Get shelf detail by id')
    .patch('/:id/shelf-parent', 'Update shelf position\'s parent - available only for admin')
    .patch('/:id/store-location', 'Updates name and shelf location for a given shelf')
    .delete('/:id', 'Delete shelf for the a organization - available only for admin')
;