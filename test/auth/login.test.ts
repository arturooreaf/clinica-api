jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/auth/infra/repositories/user.repository");
jest.mock("../../src/modules/patients/infra/repositories/patient.repository");

import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../src/common/config/env";
import { api, bearer } from "../helpers";
import { patients } from "../patients/helpers";
import { aUserWithPassword, givenUsers, PASSWORD, users } from "./helpers";

const email = "laura.fisio@example.com";

describe("POST /auth/login", () => {
  it("answers 200 with a token and the user's public data", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { id: 7, email }));

    const response = await api()
      .post("/auth/login")
      .send({ email, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      user: { id: 7, email, name: "Laura Gómez" },
    });
    expect(JSON.stringify(response.body)).not.toContain("password");
  });

  it("signs a token that carries the user id and lasts one hour", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { id: 7, email }));

    const response = await api()
      .post("/auth/login")
      .send({ email, password: PASSWORD });

    const payload = jwt.verify(
      response.body.token,
      JWT_SECRET,
    ) as jwt.JwtPayload;
    expect(payload.userId).toBe(7);
    expect(payload.exp! - payload.iat!).toBe(60 * 60);
  });

  it("gives a token that opens the protected routes", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { id: 7, email }));
    patients.getAll.mockResolvedValue([]);

    const login = await api()
      .post("/auth/login")
      .send({ email, password: PASSWORD });
    const response = await api().get("/patients").set(bearer(login.body.token));

    expect(response.status).toBe(200);
    expect(patients.getAll).toHaveBeenCalledWith(7);
  });

  it("answers 401 for a wrong password", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { email }));

    const response = await api()
      .post("/auth/login")
      .send({ email, password: "not-the-password" });

    expect(response.status).toBe(401);
    expect(response.body).not.toHaveProperty("token");
  });

  it("answers 401 for an email nobody registered", async () => {
    givenUsers();

    const response = await api()
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: PASSWORD });

    expect(response.status).toBe(401);
  });

  it("answers a wrong password exactly like an unknown email, so nobody can find out who has an account", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { email }));

    const wrongPassword = await api()
      .post("/auth/login")
      .send({ email, password: "not-the-password" });
    const unknownEmail = await api()
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: PASSWORD });

    expect(wrongPassword.status).toBe(unknownEmail.status);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body).toEqual({ error: "Invalid credentials" });
  });

  it("answers 500 without leaking the database error", async () => {
    users.findByEmail.mockRejectedValue(
      new Error("password authentication failed"),
    );

    const response = await api()
      .post("/auth/login")
      .send({ email, password: PASSWORD });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error logging in" });
  });
});
