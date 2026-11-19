jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock(
  "../../src/modules/appointments/infra/repositories/appointment.repository",
);

import { api, signedInAs } from "../helpers";
import { appointments } from "./helpers";

describe("DELETE /appointments/:id", () => {
  it("deletes the appointment and answers 204 with no body", async () => {
    appointments.remove.mockResolvedValue(true);

    const response = await api().delete("/appointments/100").set(signedInAs());

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});
    expect(appointments.remove).toHaveBeenCalledWith(100);
  });

  it("answers 404 when the appointment does not exist", async () => {
    appointments.remove.mockResolvedValue(false);

    const response = await api().delete("/appointments/999").set(signedInAs());

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: "Appointment not found" });
  });

  it("answers 400 for an id that is not a number", async () => {
    const response = await api().delete("/appointments/abc").set(signedInAs());

    expect(response.status).toBe(400);
    expect(appointments.remove).not.toHaveBeenCalled();
  });

  it("answers 500 without leaking the database error", async () => {
    appointments.remove.mockRejectedValue(new Error("lock timeout"));

    const response = await api().delete("/appointments/100").set(signedInAs());

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error deleting appointment" });
  });

  it("refuses a request without a token", async () => {
    const response = await api().delete("/appointments/100");

    expect(response.status).toBe(401);
    expect(appointments.remove).not.toHaveBeenCalled();
  });
});
