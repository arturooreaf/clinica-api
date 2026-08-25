import * as AppointmentData from "./infra/repositories/appointment.repository";
import { logger } from "../../common/logger";
import {
  Appointment,
  UpdateAppointment,
  CreateAppointment,
} from "./types/appointment.types";

export async function listAppointments(): Promise<Appointment[]> {
  const appointments = await AppointmentData.getAll();
  logger.debug({ count: appointments.length }, "Citas listadas");
  return appointments;
}

export async function getAppointmentById(
  id: number,
): Promise<Appointment | undefined> {
  const appointment = await AppointmentData.getById(id);
  if (!appointment) {
    logger.debug({ appointmentId: id }, "Cita no encontrada");
    return undefined;
  }
  logger.debug({ appointmentId: id }, "Cita consultada");
  return appointment;
}

export async function createAppointment(
  data: CreateAppointment,
): Promise<Appointment> {
  const appointment = await AppointmentData.create(data);
  logger.info(
    { appointmentId: appointment.id, patientId: appointment.patient_id },
    "Cita creada",
  );
  return appointment;
}

export async function updateAppointment(
  id: number,
  data: UpdateAppointment,
): Promise<Appointment | undefined> {
  const appointment = await AppointmentData.update(id, data);
  if (!appointment) {
    logger.warn(
      { appointmentId: id },
      "Actualizacion fallida: la cita no existe",
    );
    return undefined;
  }
  logger.info(
    { appointmentId: id, fields: Object.keys(data) },
    "Cita actualizada",
  );
  return appointment;
}

export async function deleteAppointment(id: number): Promise<boolean> {
  const deleted = await AppointmentData.remove(id);
  if (!deleted) {
    logger.warn({ appointmentId: id }, "Borrado fallido: la cita no existe");
    return false;
  }
  logger.info({ appointmentId: id }, "Cita eliminada");
  return true;
}
