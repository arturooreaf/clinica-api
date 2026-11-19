import type { NextFunction, Request, Response } from "express";
import {
  validateCreatePatient,
  validateUpdatePatient,
} from "../../src/modules/patients/patient.validation.middleware";

// A pure unit test: the middleware alone, without Express or HTTP.
// req, res and next are hand-made fakes (mocks).
function fakeRequest(body: unknown) {
  return { body } as Request;
}

function fakeResponse() {
  const res = {} as Response;
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe("validateCreatePatient", () => {
  it("lets a valid patient through", () => {
    const res = fakeResponse();
    const next: NextFunction = jest.fn();

    validateCreatePatient(fakeRequest({ name: "Marta", age: 42 }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("stops an invalid patient with a 400 and never calls next", () => {
    const res = fakeResponse();
    const next: NextFunction = jest.fn();

    validateCreatePatient(fakeRequest({ name: "Marta" }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid data" });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("validateUpdatePatient", () => {
  it("lets a single valid field through", () => {
    const res = fakeResponse();
    const next: NextFunction = jest.fn();

    validateUpdatePatient(fakeRequest({ age: 43 }), res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  it("stops a body with none of the known fields", () => {
    const res = fakeResponse();
    const next: NextFunction = jest.fn();

    validateUpdatePatient(fakeRequest({ nickname: "Martita" }), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: "Field is empty" });
    expect(next).not.toHaveBeenCalled();
  });
});
