# API Careexpand — Guía de uso y pruebas

Documentación de los endpoints de la API, con ejemplos de petición y respuesta
para verificar su funcionamiento manualmente.

Los ejemplos usan `curl`. Son equivalentes en Postman, Insomnia o Bruno.

---

## 1. Puesta en marcha

### Requisitos

- Node.js 20 o superior
- Docker
- Un fichero `.env` en la raíz, a partir de `.env.example`

### Arranque

```bash
docker compose up -d      # levanta PostgreSQL
npm run migrate up        # aplica las migraciones
npm run dev               # arranca la API
```

La API queda disponible en `http://localhost:3000`.

Al arrancar se validan todas las variables de entorno. Si falta alguna, el
proceso termina con un error indicando cuál, en lugar de arrancar en un estado
inconsistente.

### Verificación

```bash
docker ps
```

Debe aparecer el contenedor `patients-careexpand-db` con estado `Up`.

```bash
curl http://localhost:3000/
```

Respuesta esperada: `Bienvenido a Careexpand`

---

## 2. Autenticación

La API usa **JWT**. El flujo es:

1. `POST /auth/register` — crea la cuenta
2. `POST /auth/login` — devuelve un token
3. El token se envía en la cabecera `Authorization: Bearer <token>` en el resto
   de peticiones

El token **caduca a la hora** de su emisión. Pasado ese plazo hay que repetir el
login.

### 2.1 Registro

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@careexpand.com","password":"Demo1234","name":"Demo"}'
```

**201 Created**

```json
{
  "id": 3,
  "email": "demo@careexpand.com",
  "name": "Demo"
}
```

La respuesta no incluye el hash de la contraseña. El repositorio devuelve la
fila completa, pero el servicio construye un objeto de vista con únicamente los
campos públicos.

**409 Conflict** si el email ya está registrado.

### 2.2 Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@careexpand.com","password":"Demo1234"}'
```

**200 OK**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 3, "email": "demo@careexpand.com", "name": "Demo" }
}
```

**401 Unauthorized** con el mensaje `Malas credenciales`, tanto si el email no
existe como si la contraseña no coincide. La respuesta es deliberadamente
idéntica en ambos casos para no permitir enumerar usuarios registrados.

### 2.3 Uso del token

Para reutilizarlo cómodamente durante una sesión de pruebas:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@careexpand.com","password":"Demo1234"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

### 2.4 Respuestas sin token válido

| Situación | Código | Cuerpo |
| --- | --- | --- |
| Sin cabecera `Authorization` | 401 | `{"error":"Token no proporcionado"}` |
| Cabecera mal formada | 401 | `{"error":"Token no proporcionado"}` |
| Token inválido o caducado | 401 | `{"error":"Token invalido o expirado"}` |

---

## 3. Pacientes

Todos los endpoints requieren token.

### Listar

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

**200 OK** — array de pacientes.

### Obtener uno

```bash
curl http://localhost:3000/patients/1 -H "Authorization: Bearer $TOKEN"
```

**200 OK**

```json
{ "id": 1, "name": "Ana Ruiz", "age": 34, "diagnosis": "Gripe" }
```

**404** si no existe. **400** si el identificador no es numérico.

### Crear

```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana Ruiz","age":34,"diagnosis":"Gripe"}'
```

**201 Created** — devuelve el paciente con su `id` asignado.

**400 Bad Request** si los tipos no son correctos. Un middleware de validación
comprueba la entrada antes de que la petición llegue al controlador:

```bash
curl -X POST http://localhost:3000/patients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Ana","age":"treinta y cuatro"}'
```

```json
{ "error": "Datos inválidos" }
```

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `name` | string | Sí |
| `age` | number | Sí |
| `diagnosis` | string | No |

### Actualizar parcialmente

```bash
curl -X PATCH http://localhost:3000/patients/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"diagnosis":"Alta"}'
```

**200 OK** — devuelve el paciente completo, con el resto de campos intactos.

La consulta usa `COALESCE`, de modo que los campos ausentes conservan su valor
anterior en lugar de sobrescribirse a nulo.

### Eliminar

```bash
curl -i -X DELETE http://localhost:3000/patients/1 \
  -H "Authorization: Bearer $TOKEN"
```

**204 No Content** — sin cuerpo. **404** si no existe.

Al eliminar un paciente se eliminan también sus citas, por la restricción
`ON DELETE CASCADE` de la clave foránea.

---

## 4. Citas

Misma estructura que pacientes. Todos los endpoints requieren token.

| Método | Ruta |
| --- | --- |
| `GET` | `/appointments` |
| `GET` | `/appointments/:id` |
| `POST` | `/appointments` |
| `PATCH` | `/appointments/:id` |
| `DELETE` | `/appointments/:id` |

### Crear

```bash
curl -X POST http://localhost:3000/appointments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":1,"date":"2026-09-15T10:30:00Z","reason":"Revisión"}'
```

**201 Created**

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `patient_id` | number | Sí. Debe existir el paciente |
| `date` | timestamp ISO 8601 | Sí |
| `reason` | string | No |

---

## 5. Comportamiento transversal

### 5.1 Límite de peticiones

| Ámbito | Límite | Ventana |
| --- | --- | --- |
| `/auth/login` y `/auth/register` | 5 intentos **fallidos** | 15 min |
| Resto de la API | 100 peticiones | 15 min |

Al superarlo se devuelve **429 Too Many Requests**.

El limitador de autenticación está configurado con `skipSuccessfulRequests`, de
modo que solo contabiliza los intentos fallidos: un usuario legítimo no se
bloquea por entrar repetidamente, pero un ataque por fuerza bruta sí.

Comprobación:

```bash
for i in {1..6}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"demo@careexpand.com","password":"incorrecta"}'
done
```

Salida esperada: cinco `401` seguidos de un `429`.

> El contador se mantiene en memoria: se reinicia al reiniciar el proceso y no
> se comparte entre instancias. Un despliegue con varias réplicas requeriría un
> almacén externo como Redis.

### 5.2 CORS

Los orígenes permitidos se configuran en la variable `CORS_ORIGIN`, separados
por comas.

```bash
curl -i -H "Origin: http://localhost:5173" http://localhost:3000/
curl -i -H "Origin: http://otro-dominio.com" http://localhost:3000/
```

Ambas peticiones devuelven **200** con el cuerpo completo. La diferencia está en
las cabeceras: la primera incluye `Access-Control-Allow-Origin` y la segunda no.

Es el comportamiento esperado. CORS lo aplica el navegador, no el servidor: el
servidor responde siempre y se limita a indicar qué orígenes están autorizados.
Es el navegador quien impide al JavaScript de un origen no autorizado leer la
respuesta. No constituye por tanto una protección frente a clientes que no sean
navegadores.

### 5.3 Registro de actividad

Cada petición genera una entrada con método, ruta, código de estado y duración:

```
[14:17:09] INFO:
    method: "POST"
    url: "/auth/login"
    status: 200
    ms: 91
```

En desarrollo la salida se formatea de forma legible. En producción se emite
JSON en una línea por evento, apto para su ingesta en herramientas de análisis.

Los campos `password`, `token` y la cabecera `Authorization` se censuran
automáticamente antes de escribirse.

Los tokens inválidos o caducados se registran con nivel `warn`, no `error`: son
una situación prevista y frecuente, y clasificarlos como error dificultaría
localizar los fallos reales.

### 5.4 Códigos de estado

| Código | Significado |
| --- | --- |
| 200 | Petición correcta |
| 201 | Recurso creado |
| 204 | Correcta, sin contenido en la respuesta |
| 400 | Datos de entrada inválidos |
| 401 | Sin autenticar: token ausente, inválido o caducado |
| 404 | El recurso no existe |
| 409 | Conflicto con el estado actual |
| 429 | Límite de peticiones superado |
| 500 | Error interno |

---

## 6. Resolución de problemas

### 500 en los endpoints que acceden a datos

Si `GET /` responde correctamente pero cualquier operación con base de datos
devuelve 500, el contenedor de PostgreSQL no está disponible.

El registro muestra el motivo:

```
ERROR: Error al iniciar sesión
    err: { "message": "connect ECONNREFUSED 127.0.0.1:5433" }
```

```bash
docker ps                 # comprobar
docker compose up -d      # levantar
```

### 401 generalizado

El token ha caducado. Repetir el login (apartado 2.3).

### 429 en autenticación

Se ha alcanzado el límite de intentos fallidos. Esperar 15 minutos o reiniciar
el proceso, ya que el contador reside en memoria.

---

## 7. Limitaciones conocidas

**Autorización.** El middleware de autenticación verifica el token e inyecta el
identificador de usuario en la petición, pero ningún servicio comprueba la
propiedad del recurso. Cualquier usuario autenticado puede operar sobre los
datos de otro. Resolverlo requiere relacionar cada paciente con su propietario y
comprobarlo en la capa de servicio, devolviendo 403 cuando corresponda.

**Validación de entrada.** Solo `POST /patients` valida los datos recibidos. El
resto de endpoints, incluidos el registro y el login, no comprueban tipos. La
intención es sustituir las comprobaciones manuales por esquemas de validación
declarativos.

**Manejo de errores.** Existe un manejador de errores global, pero no llega a
ejecutarse porque cada controlador captura sus propias excepciones y responde
directamente. El diseño correcto pasa por definir clases de error propias,
lanzarlas desde la capa de servicio y traducirlas a códigos de estado en un
único punto.
