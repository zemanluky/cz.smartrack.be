import {defineConfig} from "drizzle-kit";

export default defineConfig({
    schema: './src/db/schema',
    out: './src/db/migrations',
    dialect: 'postgresql',
    dbCredentials: {
        url: Bun.env.DATABASE_URI!
    }
})