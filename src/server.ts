import app from "./app";
import { logger } from "./common/logger";

const port = 3000;

app.listen(port, () => {
  logger.info({ port }, "Servidor escuchando");
});
