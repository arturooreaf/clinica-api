import { Pool } from "pg";
import { DATABASE_URL } from "../common/config/env";

export const pool = new Pool({
  connectionString: DATABASE_URL
});

pool.on("error", (err) => {
  console.error("Error inesperado en el pool de PostgreSQL:", err);
});
