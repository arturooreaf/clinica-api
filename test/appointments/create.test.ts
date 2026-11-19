jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock(
  "../../src/modules/appointments/infra/repositories/appointment.repository",
);

import { api, signedInAs } from "../helpers";
import { anAppointment } from "../builders";
import { appointments, asJson } from "./helpers";

const validBody = {
  patient_id: 10,
  date: "2026-12-01T09:30:00.000Z",
  reason: "First physiotherapy session",
};

describe("POST /appointments", () => {
  it("creates the appointment and answers 201 with it", async () => {
    const created = anAppointment({ id: 100 });
    appointments.create.mockResolvedValue(created);

    const response = await api()
      .post("/appointments")
      .set(signedInAs())
      .send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(asJson(created));
  });

  it("sends only patient_id, date and reason to the database", async () => {
    appointments.create.mockResolvedValue(anAppointment());

    await api()
      .post("/appointments")
      .set(signedInAs())
      .send({ ...validBody, id: 5, status: "paid" });

    expect(appointments.create).toHaveBeenCalledWith(validBody);
  });

  it("answers 500 without leaking the database error", async () => {
    appointments.create.mockRejectedValue(
      new Error(
        'violates foreign key constraint "appointments_patient_id_fkey"',
      ),
    );

    const response = await api()
      .post("/appointments")
      .set(signedInAs())
      .send(validBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error creating appointment" });
    expect(JSON.stringify(response.body)).not.toContain("foreign key");
  });

  // Found while writing these tests: appointments have no validation
  // middleware yet (patients and emails do), so a bad body reaches SQL.
  it.todo("answers 400 when patient_id or date is missing");
  it.todo("answers 400 for a date that is not a valid ISO date");
  it.todo("answers 404 when the patient does not exist, instead of 500");

  it("refuses a request without a token", async () => {
    const response = await api().post("/appointments").send(validBody);

    expect(response.status).toBe(401);
    expect(appointments.create).not.toHaveBeenCalled();
  });
});
