import type { Request, Response } from "express";
import * as appointmentService from "./appointment.service";
import { logger } from "../../common/logger";

export async function getAppointments(_req: Request, res: Response) {
  try {
    const appointment = await appointmentService.listAppointments();
    res.status(200).json(appointment);
  } catch (error) {
    logger.error({ err: error }, "Error getting appointments");
    res.status(500).json({ error: "Error getting appointments" });
  }
}

export async function getAppointmentById(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Id must be a number" });
    }
    const appointment = await appointmentService.getAppointmentById(id);
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }
    res.status(200).json(appointment);
  } catch (error) {
    logger.error({ err: error }, "Error getting appointment");
    res.status(500).json({ error: "Error getting appointment" });
  }
}

export async function createAppointment(req: Request, res: Response) {
  try {
    const { patient_id, date, reason } = req.body;
    const newAppointment = await appointmentService.createAppointment({
      patient_id,
      date,
      reason,
    });
    res.status(201).json(newAppointment);
  } catch (error) {
    logger.error({ err: error }, "Error creating appointment");
    res.status(500).json({ error: "Error creating appointment" });
  }
}

export async function updateAppointment(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Id must be a number" });
    }
    const update = await appointmentService.updateAppointment(id, req.body);
    if (!update) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    res.status(200).json(update);
  } catch (error) {
    logger.error({ err: error }, "Error updating appointment");
    res.status(500).json({ error: "Error updating appointment" });
  }
}

export async function deleteAppointment(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Id must be a number" });
    }
    const remove = await appointmentService.deleteAppointment(id);
    if (!remove)
      return res.status(404).json({ error: "Appointment not found" });

    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Error deleting appointment");
    res.status(500).json({ error: "Error deleting appointment" });
  }
}
