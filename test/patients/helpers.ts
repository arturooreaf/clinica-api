import * as patientRepository from "../../src/modules/patients/infra/repositories/patient.repository";

// The patient repository, mocked. Every test file that uses it must call
//   jest.mock("../../src/modules/patients/infra/repositories/patient.repository");
// at the top, so each function is a jest.fn() instead of real SQL.
export const patients = jest.mocked(patientRepository);
