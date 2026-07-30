import { Router } from "express";
import * as appointmentController from "./appointment.controller";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
const router = Router();
router.use(authMiddleware)
router.get("/", appointmentController.getAppointments); //GET  /appointments
router.get("/:id", appointmentController.getAppointmentById); // GET /appointments/:id
router.post("/", appointmentController.createAppointment); // POST  /appointments/
router.patch("/:id", appointmentController.updateAppointment); //PATCH  /appointments/:id
router.delete("/:id", appointmentController.deleteAppointment); //DELETE /appointments/:id

export default router;
