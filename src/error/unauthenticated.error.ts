const DEFAULT_MESSAGE = 'This action cannot be used without authentication. Please, authenticate with you JWT token.';

/** Indicates that the user or device must be authenticated in order to use a given action */
export class Unauthenticated extends Error {
    constructor(message: string = DEFAULT_MESSAGE) {
        super(message);
    }
}