jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock(
  "../../src/modules/appointments/infra/repositories/appointment.repository",
);

import { api, signedInAs } from "../helpers";
import { anAppointment } from "../builders";
import { appointments, asJson } from "./helpers";

describe("GET /appointments/:id", () => {
  it("answers with the appointment", async () => {
    const appointment = anAppointment({ id: 100 });
    appointments.getById.mockResolvedValue(appointment);

    const response = await api().get("/appointments/100").set(signedInAs());

    expect(response.status).toBe(200);
    expect(response.body).toEqual(asJson(appointment));
    expect(appointments.getById).toHaveBeenCalledWith(100);
  });

  it("answers 404 when the appointment does not exist", async () => {
    appointments.getById.mockResolvedValue(undefined);

    const response = await api().get("/appointments/999").set(signedInAs());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Appointment not found" });
  });

  it("answers 400 for an id that is not a number, without asking the database", async () => {
    const response = await api().get("/appointments/abc").set(signedInAs());

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: "Id must be a number" });
    expect(appointments.getById).not.toHaveBeenCalled();
  });

  it("answers 500 without leaking the database error", async () => {
    appointments.getById.mockRejectedValue(
      new Error("relation does not exist"),
    );

    const response = await api().get("/appointments/100").set(signedInAs());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error getting appointment" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().get("/appointments/100");

    expect(response.status).toBe(401);
    expect(appointments.getById).not.toHaveBeenCalled();
  });
});
