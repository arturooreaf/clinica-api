import * as userRepository from "../../src/modules/auth/infra/repositories/user.repository";
import { insertUser, pgErrorCode, pool, resetDatabase } from "./db";

beforeEach(resetDatabase);
afterAll(() => pool.end());

describe("userRepository", () => {
  it("creates a user and finds it again by email", async () => {
    const created = await userRepository.create({
      email: "laura.fisio@example.com",
      password_hash: "hash",
      name: "Laura Gómez",
    });

    await expect(
      userRepository.findByEmail("laura.fisio@example.com"),
    ).resolves.toEqual(created);
  });

  it("returns undefined for an email nobody registered", async () => {
    await expect(
      userRepository.findByEmail("nobody@example.com"),
    ).resolves.toBeUndefined();
  });

  it("rejects a second user with the same email (UNIQUE)", async () => {
    await insertUser({ email: "laura.fisio@example.com" });

    const code = await pgErrorCode(
      userRepository.create({
        email: "laura.fisio@example.com",
        password_hash: "hash",
        name: "Someone Else",
      }),
    );

    expect(code).toBe("23505"); // unique_violation
  });

  it("treats a SQL injection attempt as a plain email ($1 parameters)", async () => {
    await insertUser({ email: "laura.fisio@example.com" });

    await expect(
      userRepository.findByEmail("' OR '1'='1"),
    ).resolves.toBeUndefined();
  });

  // Found while writing these tests: "Laura@example.com" and
  // "laura@example.com" are two different accounts today.
  it.todo("treats emails case-insensitively (one account per real address)");
});
