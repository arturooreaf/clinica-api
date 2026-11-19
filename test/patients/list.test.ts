jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import { api, DOCTOR_ID, OTHER_DOCTOR_ID, signedInAs } from "../helpers";
import { aPatient } from "../builders";
import { patients } from "./helpers";

describe("GET /patients", () => {
  it("lists the doctor's patients", async () => {
    const marta = aPatient({ id: 10, name: "Marta Sánchez" });
    const jorge = aPatient({ id: 11, name: "Jorge Ruiz", age: 67 });
    patients.getAll.mockResolvedValue([marta, jorge]);

    const response = await api().get("/patients").set(signedInAs());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([marta, jorge]);
  });

  it("only ever asks for the patients of the doctor in the token", async () => {
    patients.getAll.mockResolvedValue([]);

    await api().get("/patients").set(signedInAs(DOCTOR_ID));

    expect(patients.getAll).toHaveBeenCalledTimes(1);
    expect(patients.getAll).toHaveBeenCalledWith(DOCTOR_ID);
  });

  it("ignores an owner sent in the query string", async () => {
    patients.getAll.mockResolvedValue([]);

    await api()
      .get(`/patients?owner_id=${OTHER_DOCTOR_ID}`)
      .set(signedInAs(DOCTOR_ID));

    expect(patients.getAll).toHaveBeenCalledWith(DOCTOR_ID);
  });

  it("answers an empty list when the doctor has no patients yet", async () => {
    patients.getAll.mockResolvedValue([]);

    const response = await api().get("/patients").set(signedInAs());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("answers 500 without leaking the database error", async () => {
    patients.getAll.mockRejectedValue(new Error("connection refused 10.0.0.7"));

    const response = await api().get("/patients").set(signedInAs());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Server error" });
    expect(JSON.stringify(response.body)).not.toContain("10.0.0.7");
  });

  it("refuses a request without a token", async () => {
    const response = await api().get("/patients");

    expect(response.status).toBe(401);
    expect(patients.getAll).not.toHaveBeenCalled();
  });
});
