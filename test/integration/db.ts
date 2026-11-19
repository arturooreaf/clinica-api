import { pool } from "../../src/database/pool";
import type { Patient } from "../../src/modules/patients/types/patient.types";
import type { User } from "../../src/modules/auth/types/user.types";

export { pool };

// Empties every table and restarts the ids at 1, so each test starts from
// the same clean database. setup-env.ts guarantees this is a *_test database.
export async function resetDatabase(): Promise<void> {
  await pool.query(
    "TRUNCATE TABLE appointments, patients, users RESTART IDENTITY CASCADE",
  );
}

// Inserts straight into the tables (Arrange), without going through the code
// under test.
let emailCounter = 0;
export async function insertUser(overrides: Partial<User> = {}): Promise<User> {
  emailCounter++;
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3)
     RETURNING id, email, password_hash, name`,
    [
      overrides.email ?? `physio${emailCounter}@example.com`,
      overrides.password_hash ?? "not-a-real-hash",
      overrides.name ?? "Laura Gómez",
    ],
  );
  return result.rows[0];
}

export async function insertPatient(
  ownerId: number,
  overrides: Partial<Patient> = {},
): Promise<Patient> {
  const result = await pool.query(
    `INSERT INTO patients (name, age, diagnosis, owner_id) VALUES ($1, $2, $3, $4)
     RETURNING id, name, age, diagnosis, owner_id`,
    [
      overrides.name ?? "Marta Sánchez",
      overrides.age ?? 42,
      overrides.diagnosis ?? "Low back pain",
      ownerId,
    ],
  );
  return result.rows[0];
}

export async function insertAppointment(
  patientId: number,
  date = "2026-12-01T09:30:00.000Z",
  reason = "First physiotherapy session",
) {
  const result = await pool.query(
    `INSERT INTO appointments (patient_id, date, reason) VALUES ($1, $2, $3)
     RETURNING id, patient_id, date, reason`,
    [patientId, date, reason],
  );
  return result.rows[0];
}

export async function countRows(table: "users" | "patients" | "appointments") {
  const result = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
  return result.rows[0].n as number;
}

// A PostgreSQL error code, e.g. 23505 = unique violation.
export async function pgErrorCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as { code: string }).code;
  }
  throw new Error("Expected the query to fail, but it succeeded");
}
