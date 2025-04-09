import {Type} from "@sinclair/typebox";
import {Value} from "@sinclair/typebox/value";

const Environment = Type.Object({
    CONFIG_MAX_REFRESH_TOKENS: Type.Optional(Type.Number({ min: 1 })),
    CONFIG_REFRESH_TOKEN_DAYS_LIFE: Type.Optional(Type.Number({ min: 1 })),
});

const env = Value.Parse(Environment, Bun.env);

export default env;