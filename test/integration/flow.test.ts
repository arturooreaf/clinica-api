jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);

import { api, bearer } from "../helpers";
import { countRows, pool, resetDatabase } from "./db";

// The whole stack for real: HTTP -> routes -> controllers -> services ->
// repositories -> PostgreSQL. Nothing is mocked except the rate limiters.

beforeEach(resetDatabase);
afterAll(() => pool.end());

async function registerAndLogin(email: string) {
  await api()
    .post("/auth/register")
    .send({ email, password: "Physio-Test-2026!", name: "Laura Gómez" })
    .expect(201);
  const login = await api()
    .post("/auth/login")
    .send({ email, password: "Physio-Test-2026!" })
    .expect(200);
  return bearer(login.body.token);
}

describe("a physio's day", () => {
  it("registers, logs in, and manages a patient from start to end", async () => {
    const laura = await registerAndLogin("laura.fisio@example.com");

    const created = await api()
      .post("/patients")
      .set(laura)
      .send({ name: "Marta Sánchez", age: 42, diagnosis: "Low back pain" })
      .expect(201);
    const id = created.body.id;

    const list = await api().get("/patients").set(laura).expect(200);
    expect(list.body).toHaveLength(1);

    await api()
      .patch(`/patients/${id}`)
      .set(laura)
      .send({ diagnosis: "Recovered" })
      .expect(200);
    const read = await api().get(`/patients/${id}`).set(laura).expect(200);
    expect(read.body.diagnosis).toBe("Recovered");

    await api().delete(`/patients/${id}`).set(laura).expect(204);
    await api().get(`/patients/${id}`).set(laura).expect(404);
  });

  it("books an appointment for a patient and finds it", async () => {
    const laura = await registerAndLogin("laura.fisio@example.com");
    const patient = await api()
      .post("/patients")
      .set(laura)
      .send({ name: "Marta Sánchez", age: 42 })
      .expect(201);

    const booked = await api()
      .post("/appointments")
      .set(laura)
      .send({
        patient_id: patient.body.id,
        date: "2026-12-01T09:30:00.000Z",
        reason: "First session",
      })
      .expect(201);

    const read = await api()
      .get(`/appointments/${booked.body.id}`)
      .set(laura)
      .expect(200);
    expect(read.body).toMatchObject({
      id: booked.body.id,
      patient_id: patient.body.id,
      reason: "First session",
    });
  });

  // Found while writing these tests: appointments.date is a `timestamp`
  // WITHOUT time zone. 09:30Z comes back as 08:30Z on a Mac in Madrid
  // (and as 09:30Z in CI, which runs in UTC). Needs a timestamptz migration.
  it.todo(
    "keeps the exact time the client booked, whatever the server's time zone",
  );

  it("stores the password as a bcrypt hash in the real table", async () => {
    await registerAndLogin("laura.fisio@example.com");

    const result = await pool.query("SELECT password_hash FROM users");

    expect(result.rows[0].password_hash).toMatch(/^\$2[aby]\$10\$/);
  });
});

describe("two physios", () => {
  it("each one only sees their own patients", async () => {
    const laura = await registerAndLogin("laura.fisio@example.com");
    const pablo = await registerAndLogin("pablo.fisio@example.com");
    await api()
      .post("/patients")
      .set(laura)
      .send({ name: "Marta", age: 42 })
      .expect(201);
    await api()
      .post("/patients")
      .set(pablo)
      .send({ name: "Jorge", age: 67 })
      .expect(201);

    const lauras = await api().get("/patients").set(laura).expect(200);
    const pablos = await api().get("/patients").set(pablo).expect(200);

    expect(lauras.body.map((p: { name: string }) => p.name)).toEqual(["Marta"]);
    expect(pablos.body.map((p: { name: string }) => p.name)).toEqual(["Jorge"]);
  });

  it("one cannot read, change or delete the other's patient", async () => {
    const laura = await registerAndLogin("laura.fisio@example.com");
    const pablo = await registerAndLogin("pablo.fisio@example.com");
    const marta = await api()
      .post("/patients")
      .set(laura)
      .send({ name: "Marta", age: 42, diagnosis: "Low back pain" })
      .expect(201);
    const id = marta.body.id;

    const read = await api().get(`/patients/${id}`).set(pablo);
    const change = await api()
      .patch(`/patients/${id}`)
      .set(pablo)
      .send({ diagnosis: "Changed by Pablo" });
    const remove = await api().delete(`/patients/${id}`).set(pablo);

    expect(read.status).toBe(403);
    expect(change.status).toBe(403);
    expect(remove.status).toBe(403);
    const saved = await pool.query(
      "SELECT diagnosis FROM patients WHERE id = $1",
      [id],
    );
    expect(saved.rows[0].diagnosis).toBe("Low back pain");
    await expect(countRows("patients")).resolves.toBe(1);
  });

  it("the same email cannot register twice", async () => {
    await registerAndLogin("laura.fisio@example.com");

    const response = await api().post("/auth/register").send({
      email: "laura.fisio@example.com",
      password: "Other-2026!",
      name: "Copy",
    });

    expect(response.status).toBe(409);
    await expect(countRows("users")).resolves.toBe(1);
  });
});
