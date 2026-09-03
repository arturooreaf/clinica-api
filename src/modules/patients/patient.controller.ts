import { type Request, type Response } from "express";
import * as patientService from "./patient.service";
import { logger } from "../../common/logger";

export async function getPatients(req: Request, res: Response) {
  try {
    const rawId = req.user?.userId;
    if (!rawId) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const patients = await patientService.listPatients(rawId);
    res.status(200).json(patients);
  } catch (error) {
    logger.error({ err: error }, "Error con el servidor");
    return res.status(500).json({ error: "Error con el servidor" });
  }
}

export async function getPatientById(req: Request, res: Response) {
  try {
    const rawId = req.user?.userId;
    if (!rawId) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const ownerId = Number(rawId);

    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "El id debe ser un número" });
    }

    const patient = await patientService.getPatientById(id);
    if (!patient) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }

    // ERROR 403: Si el dueño del paciente no eres tú, bloqueamos
    if (patient.owner_id !== ownerId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para ver este paciente" });
    }

    res.status(200).json(patient);
  } catch (error) {
    logger.error({ err: error }, "Error al obtener el paciente");
    res.status(500).json({ error: "Error al obtener el paciente" });
  }
}

export async function createPatient(req: Request, res: Response) {
  try {
    const ownerId = req.user?.userId;
    if (!ownerId) {
      return res.status(401).json({ error: "No autenticado" });
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
    logger.error({ err: error }, "Error al crear el paciente");
    res.status(500).json({ error: "Error al crear el paciente" });
  }
}

export async function updatePatient(req: Request, res: Response) {
  try {
    const rawId = req.user?.userId;
    if (!rawId) {
      return res.status(401).json({ error: "No autenticado " });
    }
    const ownerId = Number(rawId);
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "El id debe ser un número" });
    }

    const userExistingPatient = await patientService.getPatientById(id);

    if (!userExistingPatient) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    if (userExistingPatient.owner_id !== ownerId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para modificar a este paciente" });
    }
    const { name, age, diagnosis } = req.body;

    const patient = await patientService.updatePatient(id, {
      name,
      age,
      diagnosis,
    });
    res.status(200).json(patient);
  } catch (error) {
    logger.error({ err: error }, "Error al actualizar el paciente");
    res.status(500).json({ error: "Error al actualizar el paciente " });
  }
}

export async function deletePatient(req: Request, res: Response) {
  try {
    const rawId = req.user?.userId;
    if (!rawId) {
      return res.status(401).json({ error: "No autenticado" });
    }
    const ownerId = Number(rawId);
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "el id debe ser un numero" });
    }
    const userExistingPatient = await patientService.getPatientById(id);
    if (!userExistingPatient) {
      return res.status(404).json({ error: "paciente no encontrado" });
    }
    if (userExistingPatient.owner_id !== ownerId) {
      return res
        .status(403)
        .json({ error: "No tienes permiso para modificar el paciente" });
    }
    await patientService.deletePatient(id);
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Error al borrar paciente");
    res.status(500).json({ error: "error al borrar paciente" });
  }
}
