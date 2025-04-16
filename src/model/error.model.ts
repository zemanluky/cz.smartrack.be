import {t} from "elysia";

export const errorResponse = t.Object({
    error: t.Object({
        code: t.String(),
        message: t.String(),
        metadata: t.Object({
            summary: t.String(),
            stack: t.Nullable(t.String())
        })
    })
})