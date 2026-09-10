import request from "supertest";
import app from "./app";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./common/config/env";
import { pool } from "./database/pool";

const tokenValido = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });
const tokenValido2 = jwt.sign({ userId: 2 }, JWT_SECRET, { expiresIn: "1h" });
const tokenValido3 = jwt.sign({ userId: 3 }, JWT_SECRET, { expiresIn: "1h" });

beforeEach(async () => {
  // TRUNCATE vacía las tablas más rápido que DELETE.
  // CASCADE le dice a Postgres que no se queje por las claves foráneas
  // y borre en cascada lo que haga falta.
  await pool.query("TRUNCATE TABLE users, patients, appointments CASCADE;");
});
afterAll(async () => {
  // Si no cortamos la conexión al terminar, Jest se queda colgado para siempre
  await pool.end();
});
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
describe("PATCH /patients/:id", () => {
  it("responde un 400", async () => {
    const response = await request(app)
      .patch("/patients/1")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ name: 123 });
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
  it("devuelve un 401 -> sin token", async () => {
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

//happypath edgecases integrationtest > (siguiente capa de unit test) e2e

describe("POST /patients - Happy Path", () => {
  //PREPARACION
  it("crea un paciente correctamente y devuelve 201", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES (1, 'Medico Test', 'medico1@test.com', 'hash_falso');`,
    );
    // ACCION
    const datosValidos = { name: "Carlos Perez", age: 40, diagnosis: "gripe" };

    const response = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send(datosValidos);
    // ASSERTS comprobacion
    // Aqui todo deberia ir bien

    //API

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Carlos Perez");
    expect(response.body.age).toBe(40);
    expect(response.body.diagnosis).toBe("gripe");
    expect(response.body.owner_id).toBe(1);
  });
});

describe("GET /patients - HappyPath", () => {
  //Preparacion
  it("Devuelve la lista de los pacientes  y devuelve un 200", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(2, 'Medico2', 'medico2@gmail.com', 'hash_falso');
     INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Alfredo Fernandez', 34, 'gripe', 2 );`,
    );
    //Accion
    const response = await request(app)
      .get("/patients")
      .set("Authorization", `Bearer ${tokenValido2}`);
    //Comprobacion

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe("Alfredo Fernandez");
  });
});

describe("GET /patients/:id - HappyPath", () => {
  it("devuelve un paciente por id y devuelve un 200", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico2', 'medico2@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1 );`,
    );
    //Accion
    const response = await request(app)
      .get("/patients/1")
      .set("Authorization", `Bearer ${tokenValido}`);
    //comprobacion
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Quini");
    expect(response.body.age).toBe(33);
    expect(response.body.diagnosis).toBe("gripe");
    expect(response.body.owner_id).toBe(1);
  });
});

//CREACION
describe("PATCH /patients/:id - HappyPath", () => {
  //PREPARACION
  it("Actualiza un paciente y devuelve un 200", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico2', 'medico2@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );
    //ACCION
    const response = await request(app)
      .patch("/patients/1")
      .set("Authorization", `Bearer ${tokenValido}`)
      .send({ diagnosis: "recuperado" });

    //COMPROBACION
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.diagnosis).toBe("recuperado");
  });
});

//CREACION
describe("DELETE /patients/:id -HappyPath", () => {
  //Preparacion
  it("Elimina un paciente existente y devuelve 204", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES (3, 'RaulMedico', 'medico2@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 3);`,
    );
    //ACCION
    const response = await request(app)
      .delete("/patients/1")
      .set("Authorization", `Bearer ${tokenValido3}`);
    //Comprobacion
    expect(response.status).toBe(204);

    const check = await pool.query("SELECT * FROM patients WHERE id = 1");
    expect(check.rowCount).toBe(0);
  });
});

describe("Autorizacion GET /patients/:id", () => {
  //Accion
  it("El usuario numero 2 intenta acceder a ese paciente y devuelve un 403", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico1', 'medico1@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );

    const response = await request(app)
      .get("/patients/1")
      .set("Authorization", `Bearer ${tokenValido2}`);
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("error");
    expect(response.body).not.toHaveProperty("name");
  });
});

describe("GET /patients/:id", () => {
  it("Obtenemos un usuario pero este no existe o esta vacio y devuelve un 404 - EdgeCases ", async () => {
    const response = await request(app)
      .get("/patients/1")
      .set("Authorization", `Bearer ${tokenValido}`);
    expect(response.status).toBe(404);
  });
});

describe("Autorizacion DELETE /patients/:id", () => {
  it("Un medico intenta eliminar a un paciente que no le corresponde y devuelve un 403", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico1', 'medico1@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );
    const response = await request(app)
      .delete("/patients/1")
      .set("Authorization", `Bearer ${tokenValido2}`);

    expect(response.status).toBe(403);
    const check = await pool.query("SELECT * FROM patients WHERE id = 1");
    expect(check.rowCount).toBe(1);
  });
});
