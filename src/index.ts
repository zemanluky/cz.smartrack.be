import Elysia from "elysia";
import swagger from "@elysiajs/swagger";
import {authController} from "./controller/auth.controller";
import {errorHandlerPlugin} from "./plugin/error-handler.plugin";
import {authPlugin} from "./plugin/auth.plugin";
import {organizationController} from "./controller/organization.controller";
import {notificationController} from "./controller/notification.controller";
import {productController} from "./controller/product.controller";
import {productDiscountController} from "./controller/product-discount.controller";
import {shelfController} from "./controller/shelf.controller";
import {shelfPositionController} from "./controller/shelf-position.controller";
import {userController} from "./controller/user.controller";
import {gatewayDeviceController} from "./controller/gateway-device.controller";
import { db } from "./db/db";
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import {shelfDeviceIotController} from "./controller/shelf-device.iot.controller";
import {shelfDeviceController} from "./controller/shelf-device.controller";
import cors from "@elysiajs/cors";

if (Bun.env.NODE_ENV === 'production') {
    // migrate before starting the server
    await migrate(db, {migrationsFolder: './src/db/migrations/'});
}

const app = new Elysia()
    .use(cors({
        origin: [/.*\.smartrack\.zeluk\.dev$/, 'localhost:5173']
    }))
    .use(errorHandlerPlugin)
    .use(authPlugin)
    .use(swagger({
        documentation: {
            info: {
                title: 'Smart Rack API',
                version: '0.1.0',
                description: 'API documentation for Smart Rack cloud application and IoT devices.'
            },
            components: {
                securitySchemes: {
                    userBearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Allows authentication of the user with a JWT access token.'
                    },
                    deviceBearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Allows authentication of a gateway device with a JWT access token.'
                    }
                }
            }
        }
    }))
    .use(authController)
    .use(gatewayDeviceController)
    .use(shelfDeviceIotController)
    .use(shelfDeviceController)
    .use(notificationController)
    .use(organizationController)
    .use(productController)
    .use(productDiscountController)
    .use(shelfController)
    .use(shelfPositionController)
    .use(userController)
    .listen(3000)
;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);