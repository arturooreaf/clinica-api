jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);
jest.mock("../../src/modules/auth/infra/repositories/user.repository");

import bcrypt from "bcrypt";
import { api } from "../helpers";
import { aUser } from "../builders";
import { givenUsers, PASSWORD, users } from "./helpers";

const newPhysio = {
  email: "laura.fisio@example.com",
  password: PASSWORD,
  name: "Laura Gómez",
};

// The repository returns what it was given, with an id: like the real INSERT.
function givenTheDatabaseSavesUsers() {
  users.create.mockImplementation(async (data) => ({ id: 1, ...data }));
}

describe("POST /auth/register", () => {
  it("creates the user and answers 201 with its public data", async () => {
    givenUsers();
    givenTheDatabaseSavesUsers();

    const response = await api().post("/auth/register").send(newPhysio);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      id: 1,
      email: "laura.fisio@example.com",
      name: "Laura Gómez",
    });
  });

  it("never answers the password or its hash", async () => {
    givenUsers();
    givenTheDatabaseSavesUsers();

    const response = await api().post("/auth/register").send(newPhysio);

    expect(response.body).not.toHaveProperty("password");
    expect(response.body).not.toHaveProperty("password_hash");
    expect(JSON.stringify(response.body)).not.toContain(PASSWORD);
  });

  it("stores a bcrypt hash of the password, never the password itself", async () => {
    givenUsers();
    givenTheDatabaseSavesUsers();

    await api().post("/auth/register").send(newPhysio);

    const saved = users.create.mock.calls[0]![0];
    expect(saved.password_hash).not.toBe(PASSWORD);
    expect(saved.password_hash).toMatch(/^\$2[aby]\$10\$/);
    await expect(bcrypt.compare(PASSWORD, saved.password_hash)).resolves.toBe(
      true,
    );
  });

  it("hashes the same password differently every time (salt)", async () => {
    givenUsers();
    givenTheDatabaseSavesUsers();

    await api().post("/auth/register").send(newPhysio);
    await api()
      .post("/auth/register")
      .send({ ...newPhysio, email: "other@example.com" });

    const [first, second] = users.create.mock.calls.map(
      ([data]) => data.password_hash,
    );
    expect(first).not.toBe(second);
  });

  it("answers 409 when the email is already registered, without creating anything", async () => {
    givenUsers(aUser({ email: "laura.fisio@example.com" }));

    const response = await api().post("/auth/register").send(newPhysio);

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ error: "Email is already registered" });
    expect(users.create).not.toHaveBeenCalled();
  });

  it("answers 500 without leaking the database error", async () => {
    users.findByEmail.mockRejectedValue(new Error("connection terminated"));

    const response = await api().post("/auth/register").send(newPhysio);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: "Error registering user" });
  });

  // The exercise we parked: auth has no validation middleware yet.
  it.todo("answers 400 when email, password or name is missing");
  it.todo("answers 400 for an email without @ or a password that is too short");
});
