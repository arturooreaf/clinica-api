import request from "supertest";
import app from "./app";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./common/config/env";

const tokenValido = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });
describe("GET /", () => {
  it("responde 200", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
  });
});

describe("GET /patients", () => {
  it("responde un 401", async () => {
    const response = await request(app).get("/patients");
    expect(response.status).toBe(401);
  });
});

describe("GET /patients/:id", () => {
  it("devuelve un 400 si el id no es un numero", async () => {
    const response = await request(app)
      .get("/patients/:abc")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(response.status).toBe(400);
  });
});
describe("POST /patients", () => {
  it("devuelve un 400 si el age no es un numero", async () => {
    const response = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ name: "Ana Ruiz", age: "treinta y cuatro" });
    expect(response.status).toBe(400);
  });
});
describe("GET /appointments", () => {
  it("responde un 401", async () => {
    const response = await request(app).get("/appointments");
    expect(response.status).toBe(401);
  });
});

describe("POST /emails", () => {
  it("responde un 401 -> Sin Token", async () => {
    const response = await request(app).post("/emails");
    expect(response.status).toBe(401);
  });
});

describe("POST /emails", () => {
  it("responde un 400", async () => {
    const response = await request(app)
      .post("/emails")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ to: "no-es-un-correo", subject: "Hola", text: "Prueba" });
    expect(response.status).toBe(400);
  });
});
