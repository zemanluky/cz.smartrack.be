export const DEFAULT_MESSAGE = 'This action cannot be used without authentication. Please, authenticate with you JWT token.';
type TUnauthenticatedErrCode = 'missing_jwt'|'expired'|'invalid_credentials'|'invalid_device_credentials';

/** Indicates that the user or device must be authenticated in order to use a given action */
export class Unauthenticated extends Error {
    public action: TUnauthenticatedErrCode;

    constructor(message: string = DEFAULT_MESSAGE, action: TUnauthenticatedErrCode = 'missing_jwt') {
        super(message);

        this.action = action;
    }
}