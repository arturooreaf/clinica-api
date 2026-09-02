import { pool } from "../../../../database/pool";
import {
  Patient,
  CreatePatientInput,
  UpdatePatientInput,
} from "../../types/patient.types";

//Leemos todos los resultados.

export async function getAll(ownerId:number): Promise<Patient[]> {
  const result = await pool.query("SELECT * FROM patients WHERE owner_id = $1 ORDER BY id ", [ownerId]);
  return result.rows as Patient[];
}

export async function getById(id: number): Promise<Patient | undefined> {
  const result = await pool.query("SELECT * FROM patients WHERE id= $1", [id]);
  return result.rows[0] as Patient | undefined;
}

export async function create(
  data: CreatePatientInput,
  ownerId: number,
): Promise<Patient> {
  const result = await pool.query(
    "INSERT INTO patients (name, age, diagnosis, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, name, age, diagnosis, owner_id",
    [data.name, data.age, data.diagnosis, ownerId],
  );
  return result.rows[0] as Patient;
}
export async function update(
  id: number,
  data: UpdatePatientInput,
): Promise<Patient | undefined> {
  const result = await pool.query(
    `UPDATE patients
     SET name = COALESCE($2, name),
         age = COALESCE($3, age),
         diagnosis = COALESCE($4, diagnosis)
     WHERE id = $1
     RETURNING id, name, age, diagnosis`,
    [id, data.name ?? null, data.age ?? null, data.diagnosis ?? null],
  );
  return result.rows[0] as Patient | undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM patients WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
