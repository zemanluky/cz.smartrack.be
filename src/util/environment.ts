import {Type} from "@sinclair/typebox";
import {Value} from "@sinclair/typebox/value";

const Environment = Type.Object({
    CONFIG_MAX_REFRESH_TOKENS: Type.Optional(Type.Number({ min: 1 })),
    CONFIG_REFRESH_TOKEN_DAYS_LIFE: Type.Optional(Type.Number({ min: 1 })),
    CONFIG_RESET_PASSWORD_REQUEST_VALIDITY: Type.Optional(Type.Number({ min: 1 })),
    CONFIG_FRONTEND_RESET_PASSWORD_LINK: Type.Required(Type.String({ format: 'uri' })),
    RESEND_API_KEY: Type.Required(Type.String())
});

const env = Value.Parse(Environment, Bun.env);

export default env;