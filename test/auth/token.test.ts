jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import {
  api,
  expiredTokenFor,
  tokenFor,
  tokenSignedWithAnotherSecret,
} from "../helpers";
import { patients } from "../patients/helpers";

// authMiddleware, tested through a protected route (GET /patients).

// A token with "alg": "none" has no signature at all. A classic attack:
// it must never be accepted.
function unsignedToken(userId: number): string {
  const encode = (part: object) =>
    Buffer.from(JSON.stringify(part)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ userId })}.`;
}

describe("the token on protected routes", () => {
  it("lets a valid token through", async () => {
    patients.getAll.mockResolvedValue([]);

    const response = await api()
      .get("/patients")
      .set("Authorization", `Bearer ${tokenFor(1)}`);

    expect(response.status).toBe(200);
  });

  it("refuses a request without an Authorization header", async () => {
    const response = await api().get("/patients");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Token not provided" });
  });

  it.each([
    ["another scheme", `Basic ${Buffer.from("user:pass").toString("base64")}`],
    ["the token without Bearer", tokenFor(1)],
    ["Bearer with nothing after it", "Bearer "],
    ["bearer in lowercase", `bearer ${tokenFor(1)}`],
  ])("refuses %s", async (_case, header) => {
    const response = await api().get("/patients").set("Authorization", header);

    expect(response.status).toBe(401);
    expect(patients.getAll).not.toHaveBeenCalled();
  });

  it.each([
    ["an expired token", expiredTokenFor(1)],
    ["a token signed with another secret", tokenSignedWithAnotherSecret(1)],
    ["an unsigned token (alg none)", unsignedToken(1)],
    ["something that is not a token", "not.a.token"],
  ])("refuses %s as invalid or expired", async (_case, token) => {
    const response = await api()
      .get("/patients")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid or expired token" });
    expect(patients.getAll).not.toHaveBeenCalled();
  });

  it("refuses a token whose payload was changed after signing", async () => {
    const [header, , signature] = tokenFor(1).split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ userId: 2 })).toString(
      "base64url",
    );

    const response = await api()
      .get("/patients")
      .set("Authorization", `Bearer ${header}.${forgedPayload}.${signature}`);

    expect(response.status).toBe(401);
    expect(patients.getAll).not.toHaveBeenCalled();
  });
});
