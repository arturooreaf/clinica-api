import { Router } from "express";
import * as patientController from "../controllers/patient.controller";
const router = Router();

router.get("/", patientController.getPatients);          // GET    /users
router.get("/:id", patientController.getPatientById);    // GET    /users/:id
router.post("/", patientController.createPatient);       // POST   /users
router.patch("/:id", patientController.updatePatient);   // PATCH  /users/:id
router.delete("/:id", patientController.deletePatient);  // DELETE /users/:id
export default router;