import Elysia from "elysia";
import {authController} from "./auth";
import swagger from "@elysiajs/swagger";

const app = new Elysia()
    .use(swagger())
    .use(authController)
    .listen(3000)
;

console.log(`🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`);