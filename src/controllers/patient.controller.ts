import type { Request, Response } from "express";
import * as patientService from "../services/patient.service";

export async function getPatients(_req: Request, res: Response) {
  try {
    const patients = await patientService.listPatients();
    res.status(200).json(patients);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener los pacientes" });
  }
}

export async function getPatientById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "El id debe ser un número" });
    }
    const patient = await patientService.getPatientById(id);
    if (!patient) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    res.status(200).json(patient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el paciente" });
  }
}

export async function createPatient(req: Request, res: Response) {
  try {
    const { name, age, diagnosis } = req.body;
    const newPatient = await patientService.createPatient({ name, age, diagnosis });
    res.status(201).json(newPatient);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear el paciente" });
  }
}

export async function updatePatient(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "El id debe ser un número" });
    }
    const updated = await patientService.updatePatient(id, req.body);
    if (!updated) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al actualizar el paciente" });
  }
}

export async function deletePatient(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "El id debe ser un número" });
    }
    const deleted = await patientService.deletePatient(id);
    if (!deleted) {
      return res.status(404).json({ error: "Paciente no encontrado" });
    }
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al eliminar el paciente" });
  }
}