import express from "express";
import patientRoutes from "./modules/patients/patient.routes";
import appointmentRoutes from "./modules/appointments/appointment.routes";
import requestLogger from "./common/middlewares/logger.middleware";
import errorHandle from "./common/middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import { generalLimiter } from "./common/middlewares/rateLimit.middleware";
import { corsMiddleware } from "./common/middlewares/cors.middleware";
import emailRoutes from "./modules/email/email.routes";
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "node:fs";
import path from "node:path";
import YAML from "yaml";
const app = express();

// middlewares globales
app.use(corsMiddleware);
app.use(express.json());
// documentación
const openapiPath = path.join(__dirname, "../docs/openapi.yaml");
const openapiDocument = YAML.parse(readFileSync(openapiPath, "utf8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
app.use(requestLogger);
app.use(generalLimiter);
// rutas
app.get("/", (_req, res) => {
  res.send("Bienvenido a Careexpand");
});
app.use("/patients", patientRoutes);
app.use("/appointments", appointmentRoutes);
app.use("/auth", authRoutes);
app.use("/emails", emailRoutes);
// manejador de errores
app.use(errorHandle);

export default app;
