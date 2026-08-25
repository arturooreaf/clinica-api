import express from "express";
import patientRoutes from "./modules/patients/patient.routes";
import appointmentRoutes from "./modules/appointments/appointment.routes";
import requestLogger from "./common/middlewares/logger.middleware";
import errorHandle from "./common/middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { generalLimiter } from "./common/middlewares/rateLimit.middleware";
import { corsMiddleware } from "./common/middlewares/cors.middleware";
import { logger } from "./common/logger";
const app = express();
const port = 3000;

// middlewares globales
app.use(corsMiddleware);
app.use(express.json());
app.use(requestLogger);
app.use(generalLimiter);
// rutas
app.get("/", (_req, res) => {
  res.send("Bienvenido a Careexpand");
});
app.use("/patients", patientRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/auth", authRoutes);
// manejador de errores
app.use(errorHandle);

app.listen(port, () => {
  logger.info(`Servidor escuchando en el puerto ${port}`);
});
