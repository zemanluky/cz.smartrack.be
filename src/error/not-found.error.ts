/**
 * Error indicating that a given entity does not exist.
 * Handled by global error handler by returning `HTTP 404` to the client.
 */
export class NotFound extends Error {
    public entity: string|null = null;

    constructor(message: string = 'The requested entity was not found.', entity?: string|null) {
        super(message);
        this.entity = entity || null;
    }
}