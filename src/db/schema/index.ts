import * as deviceSchema from "./device";
import * as notificationsSchema from "./notifications";
import * as organizationSchema from "./organization";
import * as productSchema from "./product";
import * as shelfSchema from "./shelf";
import * as userSchema from "./user";

export default {
    ...deviceSchema,
    ...notificationsSchema,
    ...organizationSchema,
    ...productSchema,
    ...shelfSchema,
    ...userSchema
} as const;