import bcrypt from "bcrypt";
import * as userRepository from "../../src/modules/auth/infra/repositories/user.repository";
import { aUser } from "../builders";
import type { User } from "../../src/modules/auth/types/user.types";

// The user repository, mocked. Every test file that uses it must call
//   jest.mock("../../src/modules/auth/infra/repositories/user.repository");
export const users = jest.mocked(userRepository);

// An invented password, only for tests.
export const PASSWORD = "Physio-Test-2026!";

// A user whose password_hash really is the bcrypt hash of PASSWORD.
// Cost 4 instead of 10 so the tests stay fast; bcrypt.compare reads the
// cost from the hash itself.
export async function aUserWithPassword(
  password: string = PASSWORD,
  overrides: Partial<User> = {},
): Promise<User> {
  return aUser({ password_hash: await bcrypt.hash(password, 4), ...overrides });
}

// The repository finds this user by email, and nobody else.
export function givenUsers(...known: User[]): void {
  users.findByEmail.mockImplementation(async (email) =>
    known.find((user) => user.email === email),
  );
}
