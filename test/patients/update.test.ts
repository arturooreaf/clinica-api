jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import { api, DOCTOR_ID, OTHER_DOCTOR_ID, signedInAs } from "../helpers";
import { aPatient } from "../builders";
import { patients } from "./helpers";

describe("PATCH /patients/:id", () => {
  it("updates the patient and answers 200 with it", async () => {
    patients.getById.mockResolvedValue(aPatient({ id: 10 }));
    const updated = aPatient({ id: 10, diagnosis: "Recovered" });
    patients.update.mockResolvedValue(updated);

    const response = await api()
      .patch("/patients/10")
      .set(signedInAs())
      .send({ diagnosis: "Recovered" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(updated);
  });

  it("only sends the fields it knows to the database", async () => {
    patients.getById.mockResolvedValue(aPatient({ id: 10 }));
    patients.update.mockResolvedValue(aPatient({ id: 10 }));

    await api()
      .patch("/patients/10")
      .set(signedInAs())
      .send({ diagnosis: "Recovered", owner_id: OTHER_DOCTOR_ID, id: 99 });

    expect(patients.update).toHaveBeenCalledWith(10, {
      diagnosis: "Recovered",
    });
  });

  it("answers 404 when the patient does not exist, without updating", async () => {
    patients.getById.mockResolvedValue(undefined);

    const response = await api()
      .patch("/patients/999")
      .set(signedInAs())
      .send({ age: 43 });

    expect(response.status).toBe(404);
    expect(patients.update).not.toHaveBeenCalled();
  });

  it("answers 403 for another doctor's patient, without updating", async () => {
    patients.getById.mockResolvedValue(
      aPatient({ id: 10, owner_id: OTHER_DOCTOR_ID }),
    );

    const response = await api()
      .patch("/patients/10")
      .set(signedInAs(DOCTOR_ID))
      .send({ diagnosis: "Recovered" });

    expect(response.status).toBe(403);
    expect(patients.update).not.toHaveBeenCalled();
  });

  it("answers 400 when there is nothing to update", async () => {
    const response = await api()
      .patch("/patients/10")
      .set(signedInAs())
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Field is empty" });
    expect(patients.getById).not.toHaveBeenCalled();
  });

  it.each([
    ["a name that is a number", { name: 123 }],
    ["an age written in words", { age: "forty-three" }],
    ["a diagnosis that is a list", { diagnosis: ["a", "b"] }],
  ])("answers 400 for %s", async (_case, body) => {
    const response = await api()
      .patch("/patients/10")
      .set(signedInAs())
      .send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid data" });
    expect(patients.update).not.toHaveBeenCalled();
  });

  it("answers 400 for an id that is not a number", async () => {
    const response = await api()
      .patch("/patients/abc")
      .set(signedInAs())
      .send({ age: 43 });

    expect(response.status).toBe(400);
    expect(patients.getById).not.toHaveBeenCalled();
  });

  it("answers 500 without leaking the database error", async () => {
    patients.getById.mockResolvedValue(aPatient({ id: 10 }));
    patients.update.mockRejectedValue(new Error("deadlock detected"));

    const response = await api()
      .patch("/patients/10")
      .set(signedInAs())
      .send({ age: 43 });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error updating patient" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().patch("/patients/10").send({ age: 43 });

    expect(response.status).toBe(401);
    expect(patients.update).not.toHaveBeenCalled();
  });
});
