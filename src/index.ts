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

const app = new Elysia()
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
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT'
                    }
                }
            }
        }
    }))
    .use(authController)
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