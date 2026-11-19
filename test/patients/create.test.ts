jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import { api, DOCTOR_ID, OTHER_DOCTOR_ID, signedInAs } from "../helpers";
import { aPatient } from "../builders";
import { patients } from "./helpers";

const validBody = {
  name: "Marta Sánchez",
  age: 42,
  diagnosis: "Low back pain",
};

describe("POST /patients", () => {
  it("creates the patient and answers 201 with it", async () => {
    const created = aPatient({ id: 10, ...validBody });
    patients.create.mockResolvedValue(created);

    const response = await api()
      .post("/patients")
      .set(signedInAs())
      .send(validBody);

    expect(response.status).toBe(201);
    expect(response.body).toEqual(created);
  });

  it("saves the patient under the doctor in the token", async () => {
    patients.create.mockResolvedValue(aPatient());

    await api().post("/patients").set(signedInAs(DOCTOR_ID)).send(validBody);

    expect(patients.create).toHaveBeenCalledWith(validBody, DOCTOR_ID);
  });

  it("ignores an owner_id sent in the body", async () => {
    patients.create.mockResolvedValue(aPatient());

    await api()
      .post("/patients")
      .set(signedInAs(DOCTOR_ID))
      .send({ ...validBody, owner_id: OTHER_DOCTOR_ID });

    expect(patients.create).toHaveBeenCalledWith(validBody, DOCTOR_ID);
  });

  it("accepts a patient without a diagnosis", async () => {
    const { diagnosis: _diagnosis, ...withoutDiagnosis } = aPatient();
    patients.create.mockResolvedValue(withoutDiagnosis);

    const response = await api()
      .post("/patients")
      .set(signedInAs())
      .send({ name: "Marta Sánchez", age: 42 });

    expect(response.status).toBe(201);
  });

  it.each([
    ["no body at all", {}],
    ["no name", { age: 42 }],
    ["a name that is a number", { name: 123, age: 42 }],
    ["no age", { name: "Marta" }],
    ["an age written in words", { name: "Marta", age: "forty-two" }],
    ["a diagnosis that is a number", { name: "Marta", age: 42, diagnosis: 7 }],
  ])("answers 400 for %s, without saving anything", async (_case, body) => {
    const response = await api().post("/patients").set(signedInAs()).send(body);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Invalid data" });
    expect(patients.create).not.toHaveBeenCalled();
  });

  // Found while writing these tests: the validation only checks types.
  it.todo("answers 400 for an empty name or one made only of spaces");
  it.todo("answers 400 for a negative age, a decimal age or an age over 130");

  it("answers 500 without leaking the database error", async () => {
    patients.create.mockRejectedValue(new Error("value too long for varchar"));

    const response = await api()
      .post("/patients")
      .set(signedInAs())
      .send(validBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error creating patient" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().post("/patients").send(validBody);

    expect(response.status).toBe(401);
    expect(patients.create).not.toHaveBeenCalled();
  });
});
