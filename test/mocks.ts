import type { NextFunction, Request, Response } from "express";

// Replacements for whole modules, used with jest.mock(path, factory).

// The real limiters count requests per IP for 15 minutes. In tests every
// request comes from the same IP, so they would start answering 429 halfway
// through a file. test/auth/rate-limits.test.ts tests the real ones.
export function passThroughLimiters() {
  const pass = (_req: Request, _res: Response, next: NextFunction) => next();
  return { authLimiter: pass, generalLimiter: pass };
}

// A fake Resend client: no email ever leaves the machine.
export function resendClientMock() {
  return { resendClient: { emails: { send: jest.fn() } } };
}
