import * as appointmentRepository from "../../src/modules/appointments/infra/repositories/appointment.repository";

// The appointment repository, mocked. Every test file that uses it must call
//   jest.mock("../../src/modules/appointments/infra/repositories/appointment.repository");
export const appointments = jest.mocked(appointmentRepository);

// JSON turns a Date into an ISO string: this is what the API answers.
export function asJson<T>(value: T): unknown {
  return JSON.parse(JSON.stringify(value));
}
