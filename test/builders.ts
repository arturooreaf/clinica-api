import type { Patient } from "../src/modules/patients/types/patient.types";
import type { Appointment } from "../src/modules/appointments/types/appointment.types";
import type { User } from "../src/modules/auth/types/user.types";

export const DOCTOR_ID = 1;
export const OTHER_DOCTOR_ID = 2;

// Builders: a valid object with sensible defaults. Each test changes only
// what it cares about: aPatient({ age: 70 }).
// All the data is invented: never put real patients in tests.

export function aUser(overrides: Partial<User> = {}): User {
  return {
    id: DOCTOR_ID,
    email: "laura.fisio@example.com",
    // bcrypt hash of a password nobody uses; tests that log in build their own
    password_hash:
      "$2b$10$abcdefghijklmnopqrstuuWm8h1M1n0u0m7m1u1Qe8z5Y0a6x3b2",
    name: "Laura Gómez",
    ...overrides,
  };
}

export function aPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 10,
    name: "Marta Sánchez",
    age: 42,
    diagnosis: "Low back pain",
    owner_id: DOCTOR_ID,
    ...overrides,
  };
}

export function anAppointment(
  overrides: Partial<Appointment> = {},
): Appointment {
  return {
    id: 100,
    patient_id: 10,
    date: new Date("2026-12-01T09:30:00.000Z"),
    reason: "First physiotherapy session",
    ...overrides,
  };
}
