import request from "supertest";
import app from "./app";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "./common/config/env";
import { pool } from "./database/pool";

const validToken = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });
const validToken2 = jwt.sign({ userId: 2 }, JWT_SECRET, { expiresIn: "1h" });
const validToken3 = jwt.sign({ userId: 3 }, JWT_SECRET, { expiresIn: "1h" });

beforeEach(async () => {
  // TRUNCATE empties the tables faster than DELETE.
  // CASCADE tells Postgres not to complain about foreign keys
  // and to delete dependent rows too.
  await pool.query("TRUNCATE TABLE users, patients, appointments CASCADE;");
});
afterAll(async () => {
  // If we don't close the connection at the end, Jest hangs forever
  await pool.end();
});
describe("GET /", () => {
  it("returns 200", async () => {
    const response = await request(app).get("/");
    expect(response.status).toBe(200);
  });
});

describe("GET /patients", () => {
  it("returns 401", async () => {
    const response = await request(app).get("/patients");
    expect(response.status).toBe(401);
  });
});

describe("GET /patients/:id", () => {
  it("returns 400 if the id is not a number", async () => {
    const response = await request(app)
      .get("/patients/:abc")
      .set("Authorization", `Bearer ${validToken}`);
    expect(response.status).toBe(400);
  });
});
describe("PATCH /patients/:id", () => {
  it("returns 400", async () => {
    const response = await request(app)
      .patch("/patients/1")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ name: 123 });
    expect(response.status).toBe(400);
  });
});
describe("POST /patients", () => {
  it("returns 400 if age is not a number", async () => {
    const response = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ name: "Ana Ruiz", age: "thirty-four" });
    expect(response.status).toBe(400);
  });
});
describe("GET /appointments", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).get("/appointments");
    expect(response.status).toBe(401);
  });
});

describe("POST /emails", () => {
  it("returns 401 without a token", async () => {
    const response = await request(app).post("/emails");
    expect(response.status).toBe(401);
  });
});

describe("POST /emails", () => {
  it("returns 400", async () => {
    const response = await request(app)
      .post("/emails")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ to: "not-an-email", subject: "Hello", text: "Test" });
    expect(response.status).toBe(400);
  });
});

// happy path, edge cases, integration tests > (next layer after unit tests) e2e

describe("POST /patients - Happy Path", () => {
  // ARRANGE
  it("creates a patient and returns 201", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES (1, 'Medico Test', 'medico1@test.com', 'hash_falso');`,
    );
    // ACT
    const validData = { name: "Carlos Perez", age: 40, diagnosis: "gripe" };

    const response = await request(app)
      .post("/patients")
      .set("Authorization", `Bearer ${validToken}`)
      .send(validData);
    // ASSERT
    // Everything should go well here

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
  // ARRANGE
  it("returns the list of patients with 200", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(2, 'Medico2', 'medico2@gmail.com', 'hash_falso');
     INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Alfredo Fernandez', 34, 'gripe', 2 );`,
    );
    // ACT
    const response = await request(app)
      .get("/patients")
      .set("Authorization", `Bearer ${validToken2}`);
    // ASSERT

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
    expect(response.body[0].name).toBe("Alfredo Fernandez");
  });
});

describe("GET /patients/:id - HappyPath", () => {
  it("returns a patient by id with 200", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico2', 'medico2@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1 );`,
    );
    // ACT
    const response = await request(app)
      .get("/patients/1")
      .set("Authorization", `Bearer ${validToken}`);
    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.name).toBe("Quini");
    expect(response.body.age).toBe(33);
    expect(response.body.diagnosis).toBe("gripe");
    expect(response.body.owner_id).toBe(1);
  });
});

// CREATE
describe("PATCH /patients/:id - HappyPath", () => {
  // ARRANGE
  it("updates a patient and returns 200", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico2', 'medico2@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );
    // ACT
    const response = await request(app)
      .patch("/patients/1")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ diagnosis: "recuperado" });

    // ASSERT
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
    expect(response.body.diagnosis).toBe("recuperado");
  });
});

// CREATE
describe("DELETE /patients/:id -HappyPath", () => {
  // ARRANGE
  it("deletes an existing patient and returns 204", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES (3, 'RaulMedico', 'medico2@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 3);`,
    );
    // ACT
    const response = await request(app)
      .delete("/patients/1")
      .set("Authorization", `Bearer ${validToken3}`);
    // ASSERT
    expect(response.status).toBe(204);

    const check = await pool.query("SELECT * FROM patients WHERE id = 1");
    expect(check.rowCount).toBe(0);
  });
});

describe("Authorization GET /patients/:id", () => {
  // ACT
  it("returns 403 when user 2 tries to access that patient", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico1', 'medico1@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );

    const response = await request(app)
      .get("/patients/1")
      .set("Authorization", `Bearer ${validToken2}`);
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty("error");
    expect(response.body).not.toHaveProperty("name");
  });
});

describe("GET /patients/:id", () => {
  it("returns 404 when the patient does not exist - EdgeCases", async () => {
    const response = await request(app)
      .get("/patients/1")
      .set("Authorization", `Bearer ${validToken}`);
    expect(response.status).toBe(404);
  });
});

describe("Authorization DELETE /patients/:id", () => {
  it("returns 403 when a doctor tries to delete another doctor's patient", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico1', 'medico1@gmail.com', 'hash_falso'); 
       INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );
    const response = await request(app)
      .delete("/patients/1")
      .set("Authorization", `Bearer ${validToken2}`);

    expect(response.status).toBe(403);
    const check = await pool.query("SELECT * FROM patients WHERE id = 1");
    expect(check.rowCount).toBe(1);
  });
});

describe("Authorization PATCH /patients/:id", () => {
  it("returns 403 when a doctor tries to update another doctor's patient", async () => {
    await pool.query(
      `INSERT INTO users(id, name, email, password_hash) VALUES(1, 'Medico1','medico1@gmail.com', 'hash_falso' );
      INSERT INTO patients(id, name, age, diagnosis, owner_id) VALUES (1, 'Quini', 33, 'gripe', 1);`,
    );
    const response = await request(app)
      .patch("/patients/1")
      .set("Authorization", `Bearer ${validToken2}`)
      .send({ diagnosis: "Recuperado" });

    expect(response.status).toBe(403);

    const check = await pool.query("SELECT * FROM patients WHERE id = 1");
    expect(check.rows[0].diagnosis).toBe("gripe");
  });
});
