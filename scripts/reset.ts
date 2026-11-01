import "dotenv/config";
import { Pool } from "pg";

if (process.env.NODE_ENV === "production") throw new Error("Refusing to reset a production database.");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pool.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public; DROP SCHEMA IF EXISTS drizzle CASCADE;");
await pool.end();
console.log("Databaza u pastrua.");
