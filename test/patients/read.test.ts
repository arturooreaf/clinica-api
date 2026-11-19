jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import { api, DOCTOR_ID, OTHER_DOCTOR_ID, signedInAs } from "../helpers";
import { aPatient } from "../builders";
import { patients } from "./helpers";

describe("GET /patients/:id", () => {
  it("answers with the patient", async () => {
    const marta = aPatient({ id: 10, owner_id: DOCTOR_ID });
    patients.getById.mockResolvedValue(marta);

    const response = await api().get("/patients/10").set(signedInAs(DOCTOR_ID));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(marta);
    expect(patients.getById).toHaveBeenCalledWith(10);
  });

  it("answers 404 when the patient does not exist", async () => {
    patients.getById.mockResolvedValue(undefined);

    const response = await api().get("/patients/999").set(signedInAs());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Patient not found" });
  });

  it("answers 403 for another doctor's patient, without any of its data", async () => {
    patients.getById.mockResolvedValue(
      aPatient({ id: 10, owner_id: OTHER_DOCTOR_ID, name: "Secret Name" }),
    );

    const response = await api().get("/patients/10").set(signedInAs(DOCTOR_ID));

    expect(response.status).toBe(403);
    expect(JSON.stringify(response.body)).not.toContain("Secret Name");
  });

  it.each(["abc", "ten", "1a"])(
    "answers 400 for the id %p, without asking the database",
    async (id) => {
      const response = await api().get(`/patients/${id}`).set(signedInAs());

      expect(response.status).toBe(400);
      expect(response.body).toEqual({ error: "Id must be a number" });
      expect(patients.getById).not.toHaveBeenCalled();
    },
  );

  // Found while writing these tests: Number("1.5") and Number("0x10") are
  // not NaN, so these ids reach the database.
  it.todo(
    "answers 400 for an id that is not a positive whole number (1.5, 0x10, -3)",
  );

  it("answers 500 without leaking the database error", async () => {
    patients.getById.mockRejectedValue(new Error("syntax error at or near"));

    const response = await api().get("/patients/10").set(signedInAs());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error getting patient" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().get("/patients/10");

    expect(response.status).toBe(401);
    expect(patients.getById).not.toHaveBeenCalled();
  });
});
