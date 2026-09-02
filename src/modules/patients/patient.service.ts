import * as patientData from "./infra/repositories/patient.repository";
import { logger } from "../../common/logger";
import {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
} from "./types/patient.types";

export async function listPatients(ownerId: number): Promise<Patient[]> {
  const patients = await patientData.getAll(ownerId);
  logger.debug({ count: patients.length }, "Pacientes listados");
  return patients;
}

export async function getPatientById(id: number): Promise<Patient | undefined> {
  const patient = await patientData.getById(id);
  if (!patient) {
    logger.debug({ patientId: id }, "Paciente no encontrado");
    return undefined;
  }
  logger.debug({ patientId: id }, "Paciente consultado");
  return patient;
}

export async function createPatient(
  data: CreatePatientInput,
  ownerId: number,
): Promise<Patient> {
  const patient = await patientData.create(data, ownerId);
  logger.info({ patientId: patient.id, ownerId }, "Paciente creado");
  return patient;
}

export async function updatePatient(
  id: number,
  data: UpdatePatientInput,
): Promise<Patient | undefined> {
  const patient = await patientData.update(id, data);
  if (!patient) {
    logger.warn(
      { patientId: id },
      "Actualizacion fallida: el paciente no existe",
    );
    return undefined;
  }
  logger.info(
    { patientId: id, fields: Object.keys(data) },
    "Paciente actualizado",
  );
  return patient;
}

export async function deletePatient(id: number): Promise<boolean> {
  const deleted = await patientData.remove(id);
  if (!deleted) {
    logger.warn({ patientId: id }, "Borrado fallido: el paciente no existe");
    return false;
  }
  logger.info({ patientId: id }, "Paciente eliminado");
  return true;
}
