import {t} from "elysia";

export const loginData = t.Object({
    email: t.String(),
    password: t.String()
});
export type TLoginData = typeof loginData.static;

export const deviceAuthData = t.Object({
    serial_number: t.String(),
    device_secret: t.String()
});
export type TDeviceAuthData = typeof deviceAuthData.static;

export const authResponse = t.Object({
    access: t.String()
});
export type TAuthResponse = typeof authResponse.static;

export const passwordResetRequestData = t.Object({
    email: t.String({ format: 'email' })
});
export type TPasswordResetRequestData = typeof passwordResetRequestData.static;

export const newPasswordData = t.Object({
    code: t.String(),
    password: t.RegExp(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/, {
        description: 'The new password to set.',
        error: 'Password must contain at least one uppercase and lowercase letter, one number and one special character. It must be at least 8 characters long.'
    })
});
export type TNewPasswordData = typeof newPasswordData.static;