import { migrate } from "drizzle-orm/bun-sql/migrator";
import { db } from "./db";

migrate(db, { migrationsFolder: './src/db/migrations' });