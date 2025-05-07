import Elysia, {InvalidCookieSignature, ParseError, ValidationError} from "elysia";
import {NotFound} from "../error/not-found.error";
import {DEFAULT_MESSAGE as DEFAULT_UNAUTHENTICATED_MESSAGE, Unauthenticated} from "../error/unauthenticated.error";
import * as R from 'remeda';
import {DEFAULT_MESSAGE as DEFAULT_UNAUTHORIZED_MESSAGE, Unauthorized} from "../error/unauthorized.error";
import {ElysiaCustomStatusResponse} from "elysia/dist/error";
import {BadRequest} from "../error/bad-request.error";

type TBaseErrorResponse = {
    error: {
        code: string,
        message: string,
        metadata: {
            summary: string,
            stack: string|null
        } | null
    }
}

/**
 * Instantiates base error response object.
 * @param error
 * @param message
 * @param code
 */
function createBaseErrorObject(
    error: Error|InvalidCookieSignature|ElysiaCustomStatusResponse<number, number, number>,
    message: string,
    code: string
): TBaseErrorResponse {
    console.log(error)

    return {
        error: {
            code: code,
            message: message,
            metadata: {
                stack: error instanceof Error ? (error.stack || null) : null,
                summary: error instanceof Error ? error.message : 'Unknown'
            }
        }
    };
}


/**
 * Global plugin that handles transforming thrown errors into responses.
 */
export const errorHandlerPlugin = new Elysia({ name: 'error-handler' })
    .error({ NotFound, Unauthenticated, Unauthorized, BadRequest })
    .onError(({ code, error, set }) => {
        console.log(code);

        switch(code) {
            case 'BadRequest':
                set.status = 400;
                return createBaseErrorObject(
                    error, 'Invalid endpoint usage.',
                    error.action !== null ? error.action : 'bad_request'
                );

            case 'Unauthorized':
                set.status = 403;
                return createBaseErrorObject(
                    error, DEFAULT_UNAUTHORIZED_MESSAGE,
                    error.action !== null ? `forbidden.${error.action}` : 'forbidden'
                );

            case 'Unauthenticated':
                set.status = 401;
                return createBaseErrorObject(error, DEFAULT_UNAUTHENTICATED_MESSAGE, `unathenticated.${error.action}`);

            case 'NotFound': case 'NOT_FOUND':
                set.status = 'Not Found';

                return createBaseErrorObject(
                    error,
                    'The requested resource could not be found.',
                    error instanceof NotFound && error.entity !== null ? `not_found.${error.entity}` : 'not_found'
                );

            case 'VALIDATION': case 'PARSE':
                set.status = 'Unprocessable Content';

                if (error instanceof ParseError)
                    return createBaseErrorObject(error, 'Provided content could not be parsed.', 'invalid_data');

                const validationResponse = createBaseErrorObject(
                    error, 'Provided data did not pass validations.', 'invalid_data'
                );

                return R.set(validationResponse, 'error', {
                    ...validationResponse.error,
                    issues: R.pipe(
                        (error as ValidationError).all,
                        R.filter(issue => issue.summary !== undefined),
                        R.mapToObj((issue) => [issue.path, issue.summary])
                    )
                });

            case 'INTERNAL_SERVER_ERROR':
            case 'UNKNOWN':
                set.status = 'Internal Server Error';
                return createBaseErrorObject(
                    error, 'Some unexpected error happened during the processing of your request. Please, try again later.',
                    'internal_server_error'
                );

            default:
                set.status = 'Internal Server Error';
                return createBaseErrorObject(
                    error, 'Some unexpected error happened during the processing of your request. Please, try again later.',
                    'internal_server_error'
                );
        }
    })
    .as('global')
;