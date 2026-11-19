jest.mock("../../src/modules/auth/infra/repositories/user.repository");

import * as authService from "../../src/modules/auth/auth.service";
import { aUser } from "../builders";
import { aUserWithPassword, givenUsers, PASSWORD, users } from "./helpers";

// A unit test of the service alone: no HTTP, no Express, no database.
// Only the repository is fake (a mock).

describe("authService.register", () => {
  it("answers null and saves nothing when the email exists", async () => {
    givenUsers(aUser({ email: "laura.fisio@example.com" }));

    const result = await authService.register({
      email: "laura.fisio@example.com",
      password: PASSWORD,
      name: "Laura Gómez",
    });

    expect(result).toBeNull();
    expect(users.create).not.toHaveBeenCalled();
  });

  it("answers the new user without its password hash", async () => {
    givenUsers();
    users.create.mockImplementation(async (data) => ({ id: 3, ...data }));

    const result = await authService.register({
      email: "new@example.com",
      password: PASSWORD,
      name: "Pablo Torres",
    });

    expect(result).toEqual({
      id: 3,
      email: "new@example.com",
      name: "Pablo Torres",
    });
  });
});

describe("authService.login", () => {
  it("answers null for an unknown email without checking any password", async () => {
    givenUsers();

    const result = await authService.login({
      email: "nobody@example.com",
      password: PASSWORD,
    });

    expect(result).toBeNull();
  });

  it("answers null for a wrong password", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { email: "a@example.com" }));

    const result = await authService.login({
      email: "a@example.com",
      password: "wrong",
    });

    expect(result).toBeNull();
  });

  it("answers a token and the public user for the right password", async () => {
    givenUsers(
      await aUserWithPassword(PASSWORD, { id: 4, email: "a@example.com" }),
    );

    const result = await authService.login({
      email: "a@example.com",
      password: PASSWORD,
    });

    expect(result).toEqual({
      token: expect.any(String),
      user: { id: 4, email: "a@example.com", name: "Laura Gómez" },
    });
  });
});
