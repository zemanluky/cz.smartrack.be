import Elysia, {ParseError, ValidationError} from "elysia";
import {NotFound} from "../error/not-found.error";
import {Unauthenticated} from "../error/unauthenticated.error";
import * as R from 'remeda';

type TBaseErrorResponse = {
    error: {
        code: string,
        message: string,
        metadata: {
            summary: string,
            stack: string|null
        }
    }
}

/**
 * Instantiates base error response object.
 * @param error
 * @param message
 * @param code
 */
function createBaseErrorObject(error: Error, message: string, code: string): TBaseErrorResponse {
    return {
        error: {
            code: code,
            message: message,
            metadata: {
                stack: error.stack || null,
                summary: error.message
            }
        }
    };
}


/**
 * Global plugin that handles transforming thrown errors into responses.
 */
export const errorHandlerPlugin = new Elysia()
    .error({ NotFound, Unauthenticated })
    .onError(({ code, error, set }) => {
        switch(code) {
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
        }
    })
    .as('global')
;