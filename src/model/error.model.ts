import {t} from "elysia";

export const errorResponse = t.Object({
    error: t.Object({
        code: t.String({ description: 'Unique identifying error slug.' }),
        message: t.String({ description: 'The error tha happened.' }),
        metadata: t.Object({
            summary: t.String({ description: 'The exception\'s message.' }),
            stack: t.Nullable(t.String({ description: 'Stack of where the error was thrown.' }))
        })
    })
})