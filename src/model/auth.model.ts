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