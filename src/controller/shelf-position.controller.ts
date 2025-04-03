import Elysia, {t} from "elysia";

export const shelfPositionController = new Elysia({ prefix: '/shelf-position' })
    .get('/', 'List shelf positions')
    .post('/', 'Create shelf position - available only for admin')
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .get('/:id', 'Get shelf position detail by id')
    .put('/:id', 'Update shelf position by id - all data')
    .patch('/:id', 'Update shelf position by id - name, product, assigned product & threshold')
    .delete('/:id', 'Delete shelf position by id - available only for admin')
    .get('/:id/log', 'Get shelf position logs of events/capacity')
    .post('/:id/log', 'Create shelf position log - available only for device')
    .get('/:id/config', 'Get shelf position config - available only for device')
;