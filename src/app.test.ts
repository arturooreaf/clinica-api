import request from "supertest";
import jwt from "jsonwebtoken";
import app from "./app";
import { JWT_SECRET } from "./common/config/env";

// Token valido generado a mano, sin pasar por /auth/login.
// Asi los tests no necesitan base de datos ni un usuario existente:
// el authMiddleware solo comprueba la firma, no consulta la tabla users.
const tokenValido = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });

describe("GET /", () => {
  it("responde 200", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
  });

  it("devuelve el mensaje de bienvenida", async () => {
    const response = await request(app).get("/");

    expect(response.text).toBe("Bienvenido a Careexpand");
  });

  it("devuelve una cabecera X-Trace-Id", async () => {
    const response = await request(app).get("/");

    expect(response.headers["x-trace-id"]).toBeDefined();
  });
});

describe("Proteccion de rutas privadas", () => {
  it("GET /patients sin token devuelve 401", async () => {
    const response = await request(app).get("/patients");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token no proporcionado");
  });

  it("GET /patients con un token inventado devuelve 401", async () => {
    const response = await request(app)
      .get("/patients")
      .set("Authorization", "Bearer esto-no-es-un-token");

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Token invalido o expirado");
  });

  it("GET /appointments sin token devuelve 401", async () => {
    const response = await request(app).get("/appointments");

    expect(response.status).toBe(401);
  });

  it("POST /emails sin token devuelve 401", async () => {
    const response = await request(app).post("/emails");

    expect(response.status).toBe(401);
  });
});

describe("Validacion de entrada", () => {
  it("POST /patients con age que no es numero devuelve 400", async () => {
    const response = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ name: "Ana Ruiz", age: "treinta y cuatro" });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Datos inválidos");
  });

  it("POST /patients sin name devuelve 400", async () => {
    const response = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ age: 34 });

    expect(response.status).toBe(400);
  });

  it("POST /emails con un destinatario sin arroba devuelve 400", async () => {
    const response = await request(app)
      .post("/emails")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ to: "no-es-un-correo", subject: "Hola", text: "Prueba" });

    expect(response.status).toBe(400);
  });
});

describe("Errores de identificador", () => {
  it("GET /patients/abc devuelve 400 porque el id no es un numero", async () => {
    const response = await request(app)
      .get("/patients/abc")
      .set("Authorization", `Bearer ${tokenValido}`);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("El id debe ser un número");
  });
});

// Defecto conocido: /auth/login no tiene middleware de validacion, asi que un
// cuerpo vacio revienta en el servicio y sale un 500 en lugar de un 400.
// Se deja documentado como pendiente hasta que se añada la validacion.
it.todo("POST /auth/login con cuerpo vacio deberia devolver 400, no 500");
