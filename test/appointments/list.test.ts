jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock(
  "../../src/modules/appointments/infra/repositories/appointment.repository",
);

import { api, signedInAs } from "../helpers";
import { anAppointment } from "../builders";
import { appointments, asJson } from "./helpers";

describe("GET /appointments", () => {
  it("lists the appointments, with dates as ISO strings", async () => {
    const first = anAppointment({ id: 100 });
    const second = anAppointment({
      id: 101,
      date: new Date("2026-12-02T16:00:00.000Z"),
      reason: "Knee rehabilitation",
    });
    appointments.getAll.mockResolvedValue([first, second]);

    const response = await api().get("/appointments").set(signedInAs());

    expect(response.status).toBe(200);
    expect(response.body).toEqual(asJson([first, second]));
    expect(response.body[0].date).toBe("2026-12-01T09:30:00.000Z");
  });

  it("answers an empty list when there are no appointments", async () => {
    appointments.getAll.mockResolvedValue([]);

    const response = await api().get("/appointments").set(signedInAs());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("answers 500 without leaking the database error", async () => {
    appointments.getAll.mockRejectedValue(new Error("too many clients"));

    const response = await api().get("/appointments").set(signedInAs());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error getting appointments" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().get("/appointments");

    expect(response.status).toBe(401);
    expect(appointments.getAll).not.toHaveBeenCalled();
  });
});
