jest.mock("../../src/common/middlewares/rateLimit.middleware", () =>
  jest.requireActual("../mocks").passThroughLimiters(),
);

import { api } from "../helpers";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe("GET /", () => {
  it("answers 200 with a welcome message", async () => {
    const response = await api().get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Welcome to Clinica API");
  });
});

describe("the trace id", () => {
  it("comes back on every response as X-Trace-Id", async () => {
    const response = await api().get("/");

    expect(response.headers["x-trace-id"]).toMatch(UUID);
  });

  it("is different for every request", async () => {
    const first = await api().get("/");
    const second = await api().get("/");

    expect(first.headers["x-trace-id"]).not.toBe(second.headers["x-trace-id"]);
  });
});

describe("an unknown route", () => {
  it("answers 404", async () => {
    const response = await api().get("/this-route-does-not-exist");

    expect(response.status).toBe(404);
  });
});

describe("the documentation", () => {
  it("serves Swagger UI at /docs/", async () => {
    const response = await api().get("/docs/");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("swagger-ui");
  });
});

describe("CORS", () => {
  it("allows the configured front-end origins", async () => {
    const response = await api()
      .get("/")
      .set("Origin", "http://localhost:5173");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:5173",
    );
    expect(response.headers["access-control-allow-credentials"]).toBe("true");
  });

  it("allows every origin in the comma-separated list", async () => {
    const response = await api()
      .get("/")
      .set("Origin", "http://localhost:4173");

    expect(response.headers["access-control-allow-origin"]).toBe(
      "http://localhost:4173",
    );
  });

  it("does not allow any other origin", async () => {
    const response = await api().get("/").set("Origin", "https://evil.example");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers the browser's preflight with the allowed methods", async () => {
    const response = await api()
      .options("/patients")
      .set("Origin", "http://localhost:5173")
      .set("Access-Control-Request-Method", "PATCH");

    expect(response.status).toBe(204);
    expect(response.headers["access-control-allow-methods"]).toBe(
      "GET,POST,PATCH,DELETE",
    );
  });
});

describe("a body that is not valid JSON", () => {
  it("does not leak the parser error to the client", async () => {
    const response = await api()
      .post("/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "a@example.com",');

    expect(JSON.stringify(response.body)).not.toContain("Unexpected");
    expect(response.body).not.toHaveProperty("stack");
  });

  // Found while writing these tests: the error handler answers 500 to every
  // error, even when the client sent broken JSON (a 400).
  it.todo("answers 400 instead of 500");
});
