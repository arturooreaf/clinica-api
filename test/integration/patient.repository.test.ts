import * as patientRepository from "../../src/modules/patients/infra/repositories/patient.repository";
import {
  countRows,
  insertAppointment,
  insertPatient,
  insertUser,
  pool,
  resetDatabase,
} from "./db";

beforeEach(resetDatabase);
afterAll(() => pool.end());

describe("patientRepository.getAll", () => {
  it("returns only the patients of the given owner, ordered by id", async () => {
    const laura = await insertUser();
    const pablo = await insertUser();
    const marta = await insertPatient(laura.id, { name: "Marta" });
    await insertPatient(pablo.id, { name: "Not Laura's" });
    const jorge = await insertPatient(laura.id, { name: "Jorge" });

    const result = await patientRepository.getAll(laura.id);

    expect(result.map((p) => p.id)).toEqual([marta.id, jorge.id]);
  });

  it("returns an empty list for an owner without patients", async () => {
    const laura = await insertUser();

    await expect(patientRepository.getAll(laura.id)).resolves.toEqual([]);
  });
});

describe("patientRepository.getById", () => {
  it("returns the patient with its owner", async () => {
    const laura = await insertUser();
    const marta = await insertPatient(laura.id);

    await expect(patientRepository.getById(marta.id)).resolves.toEqual({
      id: marta.id,
      name: "Marta Sánchez",
      age: 42,
      diagnosis: "Low back pain",
      owner_id: laura.id,
    });
  });

  it("returns undefined for an id that does not exist", async () => {
    await expect(patientRepository.getById(12345)).resolves.toBeUndefined();
  });
});

describe("patientRepository.create", () => {
  it("saves the patient and returns it with its new id and owner", async () => {
    const laura = await insertUser();

    const created = await patientRepository.create(
      { name: "Marta", age: 42, diagnosis: "Ankle sprain" },
      laura.id,
    );

    expect(created).toEqual({
      id: expect.any(Number),
      name: "Marta",
      age: 42,
      diagnosis: "Ankle sprain",
      owner_id: laura.id,
    });
    await expect(countRows("patients")).resolves.toBe(1);
  });

  it("saves a patient without a diagnosis as null", async () => {
    const laura = await insertUser();

    const created = await patientRepository.create(
      { name: "Marta", age: 42 },
      laura.id,
    );

    expect(created.diagnosis).toBeNull();
  });

  it("rejects a name longer than 100 characters", async () => {
    const laura = await insertUser();

    await expect(
      patientRepository.create({ name: "x".repeat(101), age: 42 }, laura.id),
    ).rejects.toMatchObject({ code: "22001" }); // string_data_right_truncation
  });
});

describe("patientRepository.update", () => {
  it("changes only the fields it receives and keeps the others", async () => {
    const laura = await insertUser();
    const marta = await insertPatient(laura.id, { name: "Marta", age: 42 });

    const updated = await patientRepository.update(marta.id, {
      diagnosis: "Recovered",
    });

    expect(updated).toMatchObject({
      name: "Marta",
      age: 42,
      diagnosis: "Recovered",
    });
    const saved = await patientRepository.getById(marta.id);
    expect(saved?.diagnosis).toBe("Recovered");
  });

  it("returns undefined for an id that does not exist", async () => {
    await expect(
      patientRepository.update(12345, { age: 50 }),
    ).resolves.toBeUndefined();
  });

  // Found while writing these tests: the UPDATE ... RETURNING does not
  // return owner_id, so PATCH /patients/:id answers without it.
  it.todo("returns the updated patient with its owner_id");
});

describe("patientRepository.remove", () => {
  it("deletes the patient and answers true", async () => {
    const laura = await insertUser();
    const marta = await insertPatient(laura.id);

    await expect(patientRepository.remove(marta.id)).resolves.toBe(true);
    await expect(countRows("patients")).resolves.toBe(0);
  });

  it("answers false for an id that does not exist", async () => {
    await expect(patientRepository.remove(12345)).resolves.toBe(false);
  });

  it("also deletes the patient's appointments (ON DELETE CASCADE)", async () => {
    const laura = await insertUser();
    const marta = await insertPatient(laura.id);
    await insertAppointment(marta.id);
    await insertAppointment(marta.id, "2026-12-08T09:30:00.000Z");

    await patientRepository.remove(marta.id);

    await expect(countRows("appointments")).resolves.toBe(0);
  });
});

describe("when a user is deleted", () => {
  it("their patients stay, without an owner (ON DELETE SET NULL)", async () => {
    const laura = await insertUser();
    const marta = await insertPatient(laura.id);

    await pool.query("DELETE FROM users WHERE id = $1", [laura.id]);

    const saved = await patientRepository.getById(marta.id);
    expect(saved?.owner_id).toBeNull();
  });
});
