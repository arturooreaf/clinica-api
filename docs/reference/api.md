# Clinica API — Usage and testing guide

Documentation of the API endpoints, with request and response examples to
check that they work by hand.

The examples use `curl`. They are equivalent in Postman, Insomnia or Bruno.

---

## 1. Getting started

### Requirements

- Node.js 24 or higher (the version CI and the Dockerfile use)
- Docker
- A `.env` file in the project root, based on `.env.example`

### Startup

```bash
docker compose up -d      # starts PostgreSQL
npm run migrate up        # applies the migrations
npm run dev               # starts the API
```

The API is available at `http://localhost:3000`.

Every environment variable is validated on startup. If one is missing, the
process exits with an error saying which one, instead of starting in an
inconsistent state.

### Check

```bash
docker ps
```

The `clinica-db` container should appear with status `Up`.

```bash
curl http://localhost:3000/
```

Expected response: `Welcome to Clinica API`

---

## 2. Authentication

The API uses **JWT**. The flow is:

1. `POST /auth/register` — creates the account
2. `POST /auth/login` — returns a token
3. The token is sent in the `Authorization: Bearer <token>` header on every
   other request

The token **expires one hour** after it is issued. After that you have to log
in again.

### 2.1 Registration

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Example123","name":"Demo"}'
```

**201 Created**

```json
{
  "id": 3,
  "email": "demo@example.com",
  "name": "Demo"
}
```

The response does not include the password hash. The repository returns the
full row, but the service builds a view object with only the public fields.

**409 Conflict** with `{"error":"Email is already registered"}` if the email
is already registered.

### 2.2 Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Example123"}'
```

**200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 3, "email": "demo@example.com", "name": "Demo" }
}
```

**401 Unauthorized** with the message `Invalid credentials`, both when the
email does not exist and when the password does not match. The response is
deliberately identical in both cases so registered users cannot be
enumerated.

### 2.3 Using the token

To reuse it easily during a testing session:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"Example123"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

### 2.4 Responses without a valid token

| Situation                 | Code | Body                                   |
| ------------------------- | ---- | -------------------------------------- |
| No `Authorization` header | 401  | `{"error":"Token not provided"}`       |
| Malformed header          | 401  | `{"error":"Token not provided"}`       |
| Invalid or expired token  | 401  | `{"error":"Invalid or expired token"}` |

---

## 3. Patients

Every endpoint requires a token. Each user only sees and changes their own
patients: the list is filtered by the user in the token, and acting on
another user's patient returns **403 Forbidden**.

### List

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

**200 OK** — array with the user's patients.

### Get one

```bash
curl http://localhost:3000/patients/1 -H "Authorization: Bearer $TOKEN"
```

**200 OK**

```json
{
  "id": 1,
  "name": "Ana Ruiz",
  "age": 34,
  "diagnosis": "Low back pain",
  "owner_id": 3
}
```

**404** with `{"error":"Patient not found"}` if it does not exist. **400**
with `{"error":"Id must be a number"}` if the identifier is not numeric.
**403** if it belongs to another user.

### Create

```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Ruiz","age":34,"diagnosis":"Low back pain"}'
```

**201 Created** — returns the patient with its assigned `id`. The `owner_id`
comes from the token, never from the body.

**400 Bad Request** if the types are wrong. A validation middleware checks
the input before the request reaches the controller:

```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","age":"thirty-four"}'
```

```json
{ "error": "Invalid data" }
```

| Field       | Type   | Required |
| ----------- | ------ | -------- |
| `name`      | string | Yes      |
| `age`       | number | Yes      |
| `diagnosis` | string | No       |

### Partial update

```bash
curl -X PATCH http://localhost:3000/patients/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"diagnosis":"Discharged"}'
```

**200 OK** — returns the patient (`id`, `name`, `age`, `diagnosis`; without
`owner_id`), with the other fields untouched.

The query uses `COALESCE`, so missing fields keep their previous value
instead of being overwritten with null.

**400** with `{"error":"Field is empty"}` if the body has none of the three
fields, and `{"error":"Invalid data"}` if any of them has the wrong type.

### Delete

```bash
curl -i -X DELETE http://localhost:3000/patients/1 \
  -H "Authorization: Bearer $TOKEN"
```

**204 No Content** — no body. **404** if it does not exist.

Deleting a patient also deletes their appointments, because of the
`ON DELETE CASCADE` constraint on the foreign key.

---

## 4. Appointments

Same structure as patients. Every endpoint requires a token.

| Method   | Route               |
| -------- | ------------------- |
| `GET`    | `/appointments`     |
| `GET`    | `/appointments/:id` |
| `POST`   | `/appointments`     |
| `PATCH`  | `/appointments/:id` |
| `DELETE` | `/appointments/:id` |

### Create

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"date":"2026-09-15T10:30:00Z","reason":"Follow-up"}'
```

**201 Created**

| Field        | Type               | Required                    |
| ------------ | ------------------ | --------------------------- |
| `patient_id` | number             | Yes. The patient must exist |
| `date`       | ISO 8601 timestamp | Yes                         |
| `reason`     | string             | No                          |

**404** with `{"error":"Appointment not found"}` and **400** with
`{"error":"Id must be a number"}` on the `/:id` routes, as with patients.

---

## 5. Emails

`POST /emails` sends an email through Resend. It requires a token.

```bash
curl -X POST http://localhost:3000/emails \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to":"patient@example.com","subject":"Your appointment","text":"See you on Monday at 10:30."}'
```

**202 Accepted** with the `id` of the email: when Resend answers, the email
is queued, not delivered.

| Field     | Type   | Required |
| --------- | ------ | -------- |
| `to`      | string | Yes      |
| `subject` | string | Yes      |
| `text`    | string | Yes      |

**400** with `Invalid data`, `Fields cannot be empty` or
`Recipient is not a valid email`. **502** with `Could not send email` if the
email provider rejects it.

---

## 6. Cross-cutting behaviour

### 6.1 Rate limiting

| Scope                              | Limit                 | Window |
| ---------------------------------- | --------------------- | ------ |
| `/auth/login` and `/auth/register` | 5 **failed** attempts | 15 min |
| Rest of the API                    | 100 requests          | 15 min |

When exceeded, it returns **429 Too Many Requests**.

The authentication limiter is configured with `skipSuccessfulRequests`, so it
only counts failed attempts: a legitimate user is not locked out for logging
in repeatedly, but a brute-force attack is.

Check:

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@example.com","password":"wrong"}'
done
```

Expected output: five `401`s followed by a `429`.

> The counter lives in memory: it resets when the process restarts and it is
> not shared between instances. A deployment with several replicas would need
> an external store such as Redis.

### 6.2 CORS

The allowed origins are configured in the `CORS_ORIGIN` variable, separated
by commas.

```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:3000/
curl -i -H "Origin: http://otro-dominio.com" http://localhost:3000/
```

Both requests return **200** with the full body. The difference is in the
headers: the first one includes `Access-Control-Allow-Origin` and the second
one does not.

This is the expected behaviour. CORS is enforced by the browser, not the
server: the server always responds and only states which origins are
allowed. It is the browser that stops JavaScript from a non-allowed origin
from reading the response. It is therefore no protection against clients
that are not browsers.

### 6.3 Activity log

Every request produces an entry with method, path, status code and duration:

```
[14:17:09] INFO:
    method: "POST"
    url: "/auth/login"
    status: 200
    ms: 91
```

In development the output is formatted to be readable. In production it emits
one line of JSON per event, ready to be ingested by analysis tools.

The `password` and `token` fields and the `Authorization` header are redacted
automatically before being written.

Invalid or expired tokens are logged at `warn` level, not `error`: they are
an expected and frequent situation, and classifying them as errors would make
it harder to find real failures.

### 6.4 Status codes

| Code | Meaning                                                 |
| ---- | ------------------------------------------------------- |
| 200  | Successful request                                      |
| 201  | Resource created                                        |
| 202  | Accepted for processing (email queued)                  |
| 204  | Successful, no content in the response                  |
| 400  | Invalid input data                                      |
| 401  | Not authenticated: token missing, invalid or expired    |
| 403  | Authenticated, but the resource belongs to someone else |
| 404  | The resource does not exist                             |
| 409  | Conflict with the current state                         |
| 429  | Rate limit exceeded                                     |
| 500  | Internal error                                          |
| 502  | An external service (the email provider) failed         |

---

## 7. Troubleshooting

### 500 on the endpoints that access data

If `GET /` responds correctly but every database operation returns 500, the
PostgreSQL container is not available.

The log shows the reason:

```
ERROR: Error logging in
    err: { "message": "connect ECONNREFUSED 127.0.0.1:5433" }
```

```bash
docker ps                 # check
docker compose up -d      # start it
```

### 401 everywhere

The token has expired. Log in again (section 2.3).

### 429 on authentication

The failed-attempt limit has been reached. Wait 15 minutes or restart the
process, since the counter lives in memory.

---

## 8. Known limitations

**Authorization.** Patients are scoped to their owner: the controller
compares the patient's `owner_id` with the user in the token and returns 403
when they do not match. Appointments are not: any authenticated user can
list, read, change or delete any appointment. Fixing it means checking
ownership of the appointment's patient before acting.

**Input validation.** Only `POST /patients`, `PATCH /patients/:id` and
`POST /emails` validate the data they receive. The other endpoints, including
registration, login and appointments, do not check types. The plan is to
replace the manual checks with declarative validation schemas.

**Error handling.** There is a global error handler, but it never runs
because each controller catches its own exceptions and responds directly. The
right design is to define custom error classes, throw them from the service
layer and translate them to status codes in a single place.
