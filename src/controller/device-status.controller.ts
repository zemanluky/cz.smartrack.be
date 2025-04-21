import Elysia, {t} from "elysia";
import {authDevicePlugin, EAuthRequirement} from "../plugin/auth.plugin";
import {deviceStatusData} from "../model/device.model";
import {pushDeviceStatus} from "../service/device.service";

export const deviceStatusController = new Elysia({ prefix: '/device-status', tags: ['Device Status'] })
    .use(authDevicePlugin)
    .guard({authDevice: EAuthRequirement.Required})
    .post('/', async ({ device, body, set }) => {
        await pushDeviceStatus(body, device!);
        set.status = 204;
    }, {
        body: deviceStatusData,
        detail: { description: 'Lets a device update its current status.' },
        response: {
            204: t.Undefined()
        }
    })