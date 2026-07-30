import { Router } from "express";
import * as patientController from "./patient.controller";
import validateCreatePatient from "./patient.validation.middleware";

const router = Router();

router.get("/", patientController.getPatients); // GET    /patients
router.get("/:id", patientController.getPatientById); // GET    /patients/:id
router.post("/", validateCreatePatient, patientController.createPatient); // POST   /users
router.patch("/:id", patientController.updatePatient); // PATCH  /patients/:id
router.delete("/:id", patientController.deletePatient); // DELETE /patients/:id

export default router;
