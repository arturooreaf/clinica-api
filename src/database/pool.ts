import { Pool } from "pg";
import { DATABASE_URL } from "../common/config/env";
import { logger } from "../common/logger";

export const pool = new Pool({
  connectionString: DATABASE_URL,
});

pool.on("error", (err) => {
  logger.error({ err }, "Unexpected error in the PostgreSQL pool");
});
