export const DEFAULT_MESSAGE = 'You are not authorized to execute this action.';

export class Unauthorized extends Error {
    public action: string|null;

    constructor(message: string = DEFAULT_MESSAGE, action: string|null = null) {
        super(message);
        this.action = action;
    }
}