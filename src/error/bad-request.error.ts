export const DEFAULT_MESSAGE = 'Invalid request. Please follow the endpoint\'s documentation.';

/**
 * Error indicating an invalid request from the client - for example, trying to use already used name.
 */
export class BadRequest extends Error {
    public action: string|null;

    constructor(message: string = DEFAULT_MESSAGE, action: string|null = null) {
        super(message);

        this.action = action;
    }
}