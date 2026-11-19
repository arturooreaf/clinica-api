import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../src/app";
import { JWT_SECRET } from "../src/common/config/env";
import { DOCTOR_ID } from "./builders";

export { DOCTOR_ID, OTHER_DOCTOR_ID } from "./builders";

// A fresh supertest client for the app. No server is started: supertest
// calls Express directly.
export const api = () => request(app);

// A valid token, signed like auth.service signs them.
export function tokenFor(userId: number = DOCTOR_ID): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "1h" });
}

// The Authorization header, ready for .set(...)
export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

// Shortcut: the header of a doctor who is signed in.
export const signedInAs = (userId: number = DOCTOR_ID) =>
  bearer(tokenFor(userId));

export function expiredTokenFor(userId: number = DOCTOR_ID): string {
  const anHourAgo = Math.floor(Date.now() / 1000) - 3600;
  return jwt.sign({ userId, exp: anHourAgo }, JWT_SECRET);
}

export function tokenSignedWithAnotherSecret(userId: number = DOCTOR_ID) {
  return jwt.sign({ userId }, "not-the-api-secret", { expiresIn: "1h" });
}
