jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import { api, DOCTOR_ID, OTHER_DOCTOR_ID, signedInAs } from "../helpers";
import { aPatient } from "../builders";
import { patients } from "./helpers";

describe("DELETE /patients/:id", () => {
  it("deletes the patient and answers 204 with no body", async () => {
    patients.getById.mockResolvedValue(aPatient({ id: 10 }));
    patients.remove.mockResolvedValue(true);

    const response = await api().delete("/patients/10").set(signedInAs());

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(patients.remove).toHaveBeenCalledWith(10);
  });

  it("answers 404 when the patient does not exist, without deleting", async () => {
    patients.getById.mockResolvedValue(undefined);

    const response = await api().delete("/patients/999").set(signedInAs());

    expect(response.status).toBe(404);
    expect(patients.remove).not.toHaveBeenCalled();
  });

  it("answers 403 for another doctor's patient, without deleting", async () => {
    patients.getById.mockResolvedValue(
      aPatient({ id: 10, owner_id: OTHER_DOCTOR_ID }),
    );

    const response = await api()
      .delete("/patients/10")
      .set(signedInAs(DOCTOR_ID));

    expect(response.status).toBe(403);
    expect(patients.remove).not.toHaveBeenCalled();
  });

  it("answers 400 for an id that is not a number", async () => {
    const response = await api().delete("/patients/abc").set(signedInAs());

    expect(response.status).toBe(400);
    expect(patients.getById).not.toHaveBeenCalled();
  });

  it("answers 500 without leaking the database error", async () => {
    patients.getById.mockResolvedValue(aPatient({ id: 10 }));
    patients.remove.mockRejectedValue(new Error("permission denied for table"));

    const response = await api().delete("/patients/10").set(signedInAs());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error deleting patient" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().delete("/patients/10");

    expect(response.status).toBe(401);
    expect(patients.remove).not.toHaveBeenCalled();
  });
});
