import Elysia from "elysia";

export const notificationController = new Elysia({ prefix: '/notification' })
    .get('/', 'List notifications for given org/user')
    .patch('/:id/read-status', 'Update read status of a notification')
;