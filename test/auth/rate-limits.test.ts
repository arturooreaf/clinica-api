// No limiter mock here: this file tests the REAL rate limiters.
jest.mock("../../src/modules/auth/infra/repositories/user.repository");

import { api } from "../helpers";
import { aUserWithPassword, givenUsers, PASSWORD } from "./helpers";

const email = "laura.fisio@example.com";

// The limiters count per IP. app.ts trusts one proxy, so X-Forwarded-For
// sets the client IP: each test uses its own IP and starts from zero.
let nextIp = 1;
const fromANewIp = () => ({ "X-Forwarded-For": `203.0.113.${nextIp++}` });

describe("login and register attempts", () => {
  it("block the sixth failed login from the same IP with a 429", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { email }));
    const ip = fromANewIp();

    for (let attempt = 1; attempt <= 5; attempt++) {
      const failed = await api()
        .post("/auth/login")
        .set(ip)
        .send({ email, password: "wrong" });
      expect(failed.status).toBe(401);
    }
    const sixth = await api()
      .post("/auth/login")
      .set(ip)
      .send({ email, password: PASSWORD });

    expect(sixth.status).toBe(429);
    expect(sixth.body).toEqual({
      error: "Too many attempts. Please try again in 15 minutes.",
    });
  });

  it("do not count successful logins", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { email }));
    const ip = fromANewIp();

    for (let attempt = 1; attempt <= 7; attempt++) {
      const response = await api()
        .post("/auth/login")
        .set(ip)
        .send({ email, password: PASSWORD });
      expect(response.status).toBe(200);
    }
  });

  it("are counted per IP: another IP can still log in", async () => {
    givenUsers(await aUserWithPassword(PASSWORD, { email }));
    const attacker = fromANewIp();
    for (let attempt = 1; attempt <= 6; attempt++) {
      await api()
        .post("/auth/login")
        .set(attacker)
        .send({ email, password: "wrong" });
    }

    const response = await api()
      .post("/auth/login")
      .set(fromANewIp())
      .send({ email, password: PASSWORD });

    expect(response.status).toBe(200);
  });
});

describe("the general limit", () => {
  it("answers 429 after 100 requests from the same IP", async () => {
    const ip = fromANewIp();

    for (let request = 1; request <= 100; request++) {
      const response = await api().get("/").set(ip);
      expect(response.status).toBe(200);
    }
    const extra = await api().get("/").set(ip);

    expect(extra.status).toBe(429);
    expect(extra.body).toEqual({
      error: "Too many requests. Please try again later.",
    });
  });

  it("tells the client its limit in the standard headers", async () => {
    const response = await api().get("/").set(fromANewIp());

    expect(response.headers["ratelimit-limit"]).toBe("100");
    expect(response.headers["ratelimit-remaining"]).toBe("99");
  });
});
