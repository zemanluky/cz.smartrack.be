import Elysia from "elysia";
import swagger from "@elysiajs/swagger";
import {authController} from "./controller/auth.controller";
import {errorHandlerPlugin} from "./plugin/error-handler.plugin";
import {authPlugin} from "./plugin/auth.plugin";
import {organizationController} from "./controller/organization.controller";

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
    .use(organizationController)
    .listen(3000)
;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);