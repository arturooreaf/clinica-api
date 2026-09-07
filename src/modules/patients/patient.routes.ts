import { Router } from "express";
import * as patientController from "./patient.controller";
import { validateCreatePatient } from "./patient.validation.middleware";
import { validateUpdatePatient } from "./patient.validation.middleware";
import { authMiddleware } from "../../common/middlewares/auth.middleware";
const router = Router();
router.use(authMiddleware);
router.get("/", patientController.getPatients); // GET    /patients
router.get("/:id", patientController.getPatientById); // GET    /patients/:id
router.post("/", validateCreatePatient, patientController.createPatient); // POST   /patients
router.patch("/:id", validateUpdatePatient, patientController.updatePatient); // PATCH  /patients/:id
router.delete("/:id", patientController.deletePatient); // DELETE /patients/:id

export default router;
