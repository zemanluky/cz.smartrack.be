import Elysia from "elysia";
import {authController} from "./auth";
import swagger from "@elysiajs/swagger";

const app = new Elysia()
    .use(swagger({
        documentation: {
            info: {
                title: 'Smart Rack API',
                version: '0.1.0',
                description: 'API documentation for Smart Rack cloud application and IoT devices.'
            }
        }
    }))
    .use(authController)
    .listen(3000)
;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);