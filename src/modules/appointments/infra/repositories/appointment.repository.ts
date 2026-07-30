import { pool } from "../../../../database/pool";
import {
  Appointment,
  CreateAppointment,
  UpdateAppointment,
} from "../../types/appointment.types";

export async function getAll(): Promise<Appointment[]> {
  const result = await pool.query("SELECT * FROM appointments ORDER BY id");
  return result.rows as Appointment[];
}

export async function getById(id: number): Promise<Appointment | undefined> {
  const result = await pool.query("SELECT * FROM appointments WHERE id =$1", [
    id,
  ]);
  return result.rows[0] as Appointment | undefined;
}
export async function create(data: CreateAppointment): Promise<Appointment> {
  const result = await pool.query(
    "INSERT INTO appointments (patient_id, date, reason) VALUES ($1,$2,$3) RETURNING id, patient_id, date, reason",
    [data.patient_id, data.date, data.reason],
  );
  return result.rows[0] as Appointment;
}

export async function update(
  id: number,
  data: UpdateAppointment,
): Promise<Appointment | undefined> {
  const result = await pool.query(
    `UPDATE appointments 
            SET date = COALESCE ($2, date),
                reason = COALESCE ($3, reason)
            WHERE id = $1
            RETURNING id, patient_id, date, reason `,
    [id, data.date ?? null, data.reason ?? null],
  );
  return result.rows[0] as Appointment | undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM appointments WHERE id = $1", [
    id,
  ]);
  return (result.rowCount ?? 0) > 0;
}
