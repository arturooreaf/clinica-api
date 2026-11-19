import { type Request, type Response } from "express";
import * as patientService from "./patient.service";
import { logger } from "../../common/logger";

export async function getPatients(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const patients = await patientService.listPatients(ownerId);
    res.status(200).json(patients);
  } catch (error) {
    logger.error({ err: error }, "Server error");
    return res.status(500).json({ error: "Server error" });
  }
}

export async function getPatientById(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Id must be a number" });
    }

    const patient = await patientService.getPatientById(id);
    if (!patient) {
      return res.status(404).json({ error: "Patient not found" });
    }

    // 403 ERROR: if you are not the patient's owner, block the request
    if (patient.owner_id !== ownerId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to view this patient" });
    }

    res.status(200).json(patient);
  } catch (error) {
    logger.error({ err: error }, "Error getting patient");
    res.status(500).json({ error: "Error getting patient" });
  }
}

export async function createPatient(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const { name, age, diagnosis } = req.body;
    const newPatient = await patientService.createPatient(
      {
        name,
        age,
        diagnosis,
      },
      ownerId,
    );
    res.status(201).json(newPatient);
  } catch (error) {
    logger.error({ err: error }, "Error creating patient");
    res.status(500).json({ error: "Error creating patient" });
  }
}

export async function updatePatient(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Id must be a number" });
    }

    const userExistingPatient = await patientService.getPatientById(id);

    if (!userExistingPatient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    if (userExistingPatient.owner_id !== ownerId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to update this patient" });
    }
    const { name, age, diagnosis } = req.body;

    const patient = await patientService.updatePatient(id, {
      name,
      age,
      diagnosis,
    });
    res.status(200).json(patient);
  } catch (error) {
    logger.error({ err: error }, "Error updating patient");
    res.status(500).json({ error: "Error updating patient" });
  }
}

export async function deletePatient(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Id must be a number" });
    }
    const userExistingPatient = await patientService.getPatientById(id);
    if (!userExistingPatient) {
      return res.status(404).json({ error: "Patient not found" });
    }
    if (userExistingPatient.owner_id !== ownerId) {
      return res
        .status(403)
        .json({ error: "You do not have permission to delete this patient" });
    }
    await patientService.deletePatient(id);
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Error deleting patient");
    res.status(500).json({ error: "Error deleting patient" });
  }
}
