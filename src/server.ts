import app from "./app";
import { logger } from "./common/logger";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

app.listen(port, () => {
  logger.info({ port }, "Servidor escuchando");
});
