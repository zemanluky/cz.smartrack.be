import Elysia, {t} from "elysia";

export const userController = new Elysia({ prefix: '/user', tags: ['User'] })
    .get('/', 'List users for the current organization')
    .post('/', 'Create new user')
    .guard({
        params: t.Object({ id: t.Number() })
    })
    .put('/:id', 'Update a given user')
    .delete('/:id', 'Soft delete a given user')
;