import {type} from "arktype";
import {coerceNumber} from "./validation";

const Environment = type({
    "CONFIG_MAX_REFRESH_TOKENS?": coerceNumber.pipe(type("number > 0")),
    "CONFIG_REFRESH_TOKEN_DAYS_LIFE?": coerceNumber.pipe(type("number > 0")),
});

type Environment = typeof Environment.infer;
const result = Environment(Bun.env);

export default (): Environment => {
    if (result instanceof type.errors) {
        console.error(result.summary);
        throw new Error('Failed to validate environment.');
    }

    return result;
};