
import { pool } from "../db/pool";
import { Patient, CreatePatientInput,UpdatePatientInput } from "../types/patient";

//Leemos todos los resultados. 

export async function getAll(): Promise<Patient[]> {
const result = await pool.query (
    "SELECT * FROM patients ORDER BY id"
);
return result.rows as Patient[];
}

export async function getById(id:number): Promise <Patient | undefined> {
    const result = await pool.query(
      "SELECT * FROM patients WHERE id= $1" , [id]
    );
return result.rows[0] as Patient | undefined
}

export async function create (data: CreatePatientInput): Promise <Patient>{
    const result = await pool.query(
        "INSERT INTO patients (name, age, diagnosis) VALUES ($1, $2, $3) RETURNING id, name, age, diagnosis", [data.name, data.age, data.diagnosis ]
    )
    return result.rows[0] as Patient;
}
export async function update(id: number, data: UpdatePatientInput): Promise<Patient | undefined> {
  const result = await pool.query(
    `UPDATE patients
     SET name = COALESCE($2, name),
         age = COALESCE($3, age),
         diagnosis = COALESCE($4, diagnosis)
     WHERE id = $1
     RETURNING id, name, age, diagnosis`,
    [id, data.name ?? null, data.age ?? null, data.diagnosis ?? null]
  );
  return result.rows[0] as Patient | undefined;
}

export async function remove(id: number): Promise<boolean> {
  const result = await pool.query("DELETE FROM patients WHERE id = $1", [id]);
  return (result.rowCount ?? 0) > 0;
}
