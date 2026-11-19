import * as appointmentRepository from "../../src/modules/appointments/infra/repositories/appointment.repository";
import {
  insertAppointment,
  insertPatient,
  insertUser,
  pgErrorCode,
  pool,
  resetDatabase,
} from "./db";

beforeEach(resetDatabase);
afterAll(() => pool.end());

async function aPatientInTheDatabase() {
  const laura = await insertUser();
  return insertPatient(laura.id);
}

describe("appointmentRepository.create", () => {
  it("saves the appointment and returns it with a Date", async () => {
    const marta = await aPatientInTheDatabase();

    const created = await appointmentRepository.create({
      patient_id: marta.id,
      date: new Date("2026-12-01T09:30:00.000Z"),
      reason: "First session",
    });

    expect(created).toMatchObject({
      patient_id: marta.id,
      reason: "First session",
    });
    expect(created.date).toBeInstanceOf(Date);
  });

  it("rejects an appointment for a patient that does not exist (foreign key)", async () => {
    const code = await pgErrorCode(
      appointmentRepository.create({
        patient_id: 12345,
        date: new Date("2026-12-01T09:30:00.000Z"),
      }),
    );

    expect(code).toBe("23503"); // foreign_key_violation
  });

  it("rejects an appointment without a date (NOT NULL)", async () => {
    const marta = await aPatientInTheDatabase();

    const code = await pgErrorCode(
      appointmentRepository.create({
        patient_id: marta.id,
        date: undefined as unknown as Date,
      }),
    );

    expect(code).toBe("23502"); // not_null_violation
  });
});

describe("appointmentRepository.getAll and getById", () => {
  it("lists every appointment ordered by id", async () => {
    const marta = await aPatientInTheDatabase();
    const first = await insertAppointment(marta.id, "2026-12-08T09:30:00.000Z");
    const second = await insertAppointment(
      marta.id,
      "2026-12-01T09:30:00.000Z",
    );

    const result = await appointmentRepository.getAll();

    expect(result.map((a) => a.id)).toEqual([first.id, second.id]);
  });

  it("finds one appointment by id, or undefined", async () => {
    const marta = await aPatientInTheDatabase();
    const appointment = await insertAppointment(marta.id);

    await expect(
      appointmentRepository.getById(appointment.id),
    ).resolves.toMatchObject({
      id: appointment.id,
      patient_id: marta.id,
    });
    await expect(appointmentRepository.getById(12345)).resolves.toBeUndefined();
  });
});

describe("appointmentRepository.update", () => {
  it("changes only the reason and keeps the date", async () => {
    const marta = await aPatientInTheDatabase();
    const appointment = await insertAppointment(marta.id);

    const updated = await appointmentRepository.update(appointment.id, {
      reason: "Follow-up",
    });

    expect(updated?.reason).toBe("Follow-up");
    expect(updated?.date).toEqual(appointment.date);
  });

  it("returns undefined for an id that does not exist", async () => {
    await expect(
      appointmentRepository.update(12345, { reason: "x" }),
    ).resolves.toBeUndefined();
  });
});

describe("appointmentRepository.remove", () => {
  it("answers true when it deletes and false when there was nothing", async () => {
    const marta = await aPatientInTheDatabase();
    const appointment = await insertAppointment(marta.id);

    await expect(appointmentRepository.remove(appointment.id)).resolves.toBe(
      true,
    );
    await expect(appointmentRepository.remove(appointment.id)).resolves.toBe(
      false,
    );
  });
});
