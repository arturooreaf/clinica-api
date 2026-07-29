import express from "express";
import patientRoutes from "./routes/patient.routes";
import appointmentRoutes from "./routes/appointment.routes";
import logger from "./middlewares/logger.middleware";
import errorHandle from "./middlewares/error.middleware";

const app = express();
const port = 3000;

// middlewares globales
app.use(express.json());
app.use(logger);

// rutas
app.get('/', (_req, res) => {
  res.send('Bienvenido a Careexpand');
});
app.use("/patients", patientRoutes);
app.use("/appointments", appointmentRoutes);

// manejador de errores
app.use(errorHandle);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});