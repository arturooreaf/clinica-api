import * as patientData from "./infra/repositories/patient.repository";
import { logger } from "../../common/logger";
import {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
} from "./types/patient.types";

export async function listPatients(owner_Id: number): Promise<Patient[]> {
  const patients = await patientData.getAll(owner_Id);
  logger.info({ ownerId: owner_Id }, "Patients listed");
  return patients;
}

export async function getPatientById(id: number): Promise<Patient | undefined> {
  const patient = await patientData.getById(id);
  if (!patient) {
    logger.debug({ patientId: id }, "Patient not found");
    return undefined;
  }
  logger.debug({ patientId: id }, "Patient retrieved");
  return patient;
}

export async function createPatient(
  data: CreatePatientInput,
  ownerId: number,
): Promise<Patient> {
  const patient = await patientData.create(data, ownerId);
  logger.info({ patientId: patient.id, ownerId }, "Patient created");
  return patient;
}

export async function updatePatient(
  id: number,
  data: UpdatePatientInput,
): Promise<Patient | undefined> {
  const patient = await patientData.update(id, data);
  if (!patient) {
    logger.warn({ patientId: id }, "Update failed: patient does not exist");
    return undefined;
  }
  logger.info({ patientId: id, fields: Object.keys(data) }, "Patient updated");
  return patient;
}

export async function deletePatient(id: number): Promise<boolean> {
  const deleted = await patientData.remove(id);
  if (!deleted) {
    logger.warn({ patientId: id }, "Delete failed: patient does not exist");
    return false;
  }
  logger.info({ patientId: id }, "Patient deleted");
  return true;
}
