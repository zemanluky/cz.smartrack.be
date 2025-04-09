import {type} from "arktype";

// number coercion
export const coerceNumber = type("string|number|boolean").pipe((s): number => Number(s));