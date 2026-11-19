jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock(
  "../../src/modules/appointments/infra/repositories/appointment.repository",
);

import { api, signedInAs } from "../helpers";
import { anAppointment } from "../builders";
import { appointments, asJson } from "./helpers";

describe("PATCH /appointments/:id", () => {
  it("updates the appointment and answers 200 with it", async () => {
    const updated = anAppointment({ id: 100, reason: "Follow-up" });
    appointments.update.mockResolvedValue(updated);

    const response = await api()
      .patch("/appointments/100")
      .set(signedInAs())
      .send({ reason: "Follow-up" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(asJson(updated));
    expect(appointments.update).toHaveBeenCalledWith(100, {
      reason: "Follow-up",
    });
  });

  it("answers 404 when the appointment does not exist", async () => {
    appointments.update.mockResolvedValue(undefined);

    const response = await api()
      .patch("/appointments/999")
      .set(signedInAs())
      .send({ reason: "Follow-up" });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Appointment not found" });
  });

  it("answers 400 for an id that is not a number", async () => {
    const response = await api()
      .patch("/appointments/abc")
      .set(signedInAs())
      .send({ reason: "Follow-up" });

    expect(response.status).toBe(400);
    expect(appointments.update).not.toHaveBeenCalled();
  });

  it("answers 500 without leaking the database error", async () => {
    appointments.update.mockRejectedValue(new Error("invalid input syntax"));

    const response = await api()
      .patch("/appointments/100")
      .set(signedInAs())
      .send({ date: "not a date" });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error updating appointment" });
  });

  it.todo("answers 400 when the body has neither date nor reason");

  it("refuses a request without a token", async () => {
    const response = await api()
      .patch("/appointments/100")
      .send({ reason: "Follow-up" });

    expect(response.status).toBe(401);
    expect(appointments.update).not.toHaveBeenCalled();
  });
});
