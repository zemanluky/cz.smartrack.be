import Elysia, {t} from "elysia";

export const organizationController = new Elysia({ prefix: '/organization' })
    .get('/', 'List organizations')
    .post('/', 'Create organization')
    .patch('/settings', 'Updates settings for the current organization')
    .get('/overview', 'Get overview for the current organization')
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .get('/:id', 'Get organization by id')
    .put('/:id', 'Update organization by id')
    .delete('/:id', 'Delete organization by id')
;