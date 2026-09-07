# Dónde me quedé

> Nota para retomar la formación en una sesión nueva. Pegar al empezar el chat.

## Cómo quiero que me enseñes

Sé mi mentor de backend, **en español** y **poco a poco, un concepto a la vez**.
Vengo de 1º de DAM: tengo base de programación y SQL, pero JavaScript,
TypeScript y backend son nuevos. Tengo TDAH inatento, así que no me vuelques la
teoría de golpe.

Para cada concepto: explicación con analogía real, ejemplo de código corto y
comentado, y un ejercicio que **resuelvo yo**. **No me des el código hecho**:
corrígeme y dame pistas. La solución completa solo como último recurso.
Si te digo "corto", contéstame en tres líneas sin la clase entera.

---

## Estado del proyecto

API REST con Express + TypeScript + PostgreSQL (Docker), JWT, bcrypt, Pino,
rate limiting, CORS, Swagger en `/docs` y 7 tests con Jest + supertest.

- Módulos 1 a 11 de mi ruta: **terminados**.
- **Autorización terminada.** Las cinco rutas de `/patients` comprueban el dueño
  (`owner_id`): el listado filtra en el SQL, y `GET /:id`, `PATCH` y `DELETE`
  devuelven 401 → 400 → 404 → 403 en ese orden.
- Rama `main`, árbol limpio. `tsc --noEmit`, `lint` y `format:check` pasan.

---

## Lo que me ha pedido mi jefe (reunión de hoy)

Me ha dicho que estoy preparado para un proyecto real y me ha dado esta lista:

```
happy path > edge cases > integration test > (siguiente capa: unit test) > e2e
```

- **e2e no es prioritario.**
- **Render sí es prioritario**, y me ha avisado de que es complicado.

**Dónde estoy respecto a eso:** mis 7 tests ya son integration tests, pero
**6 de 7 son edge cases** (401 y 400). El único "happy path" es `GET /` que solo
saluda. **No tengo ni un happy path real**: nada comprueba que crear un paciente
funcione, que listarlos devuelva la lista, o que borrar borre.

El motivo es que **no hay base de datos de test**, y todos los caminos felices
tocan la base de datos. Montarla es lo que desbloquea los happy paths.

---

## Plan de trabajo, en orden

### 1. Validar el PATCH (lo primero, ~20 min)

En `src/modules/patients/patient.validation.middleware.ts` tengo
`validateCreatePatient` funcionando y montado en el POST. **El PATCH no tiene
ningún middleware de validación** en `patient.routes.ts` (línea 10). Resultado:
un `PATCH` con `{"age": "treinta"}` llega al SQL, Postgres rechaza el texto en
una columna `integer` y respondo **500 en vez de 400**.

Empecé un `validateUpdatePatient` vacío y lo borré, porque un middleware sin
`next()` deja la petición colgada para siempre.

Las reglas del PATCH son **distintas** a las del POST: en el POST `name` y `age`
son obligatorios; en el PATCH todos los campos son opcionales, pero si vienen
tienen que ser del tipo correcto, y si **no viene ninguno** también es 400.
Quiero escribirla yo con pistas.

### 2. Cuatro detalles pendientes

- `Number(rawId)` es redundante en cuatro sitios del controlador: `userId` ya es
  `number` según `UserPayload` en `express.d.ts`.
- `owner_Id` en `patient.repository.ts` línea 10 → `ownerId` (snake_case para
  SQL, camelCase para TypeScript).
- Mensajes de error inconsistentes: `"No autenticado "` con espacio de más,
  `"el id debe ser un numero"` sin mayúscula ni tilde, y el 403 del `DELETE`
  dice "modificar" cuando debería decir "borrar".
- `"build": "tsc && cp -r docs dist/"` — ese `cp` es inútil: `app.ts` lee
  `path.join(__dirname, "../docs/openapi.yaml")`, que compilado apunta a la raíz
  del proyecto, no a `dist/docs`.
- Añadir `.DS_Store` al `.gitignore`.

Luego `npm test`, las tres puertas de calidad y commit.

### 3. Desplegar en Render (módulo 12)

Nunca lo he hecho. Ya está hecho:

- `server.ts` usa `process.env.PORT ? Number(process.env.PORT) : 3000`.
- `package.json` tiene `build` y `"start": "node dist/server.js"`.
- `tsconfig.json` tiene `rootDir: "./src"` y `outDir: "./dist"`.

Me falta y no sé hacer:

- Crear el servicio en Render y conectarlo al repositorio de GitHub.
- La base de datos PostgreSQL de producción: en local uso Docker, y no sé cómo
  va en Render ni de dónde sale la `DATABASE_URL`.
- Meter las nueve variables de entorno en el panel:
  `PORT`, `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
  `JWT_SECRET`, `CORS_ORIGIN`, `RESEND_API_KEY`, `RESEND_FROM`.
- Ejecutar las migraciones contra la base de datos de producción.
- Que `docs/openapi.yaml` llegue al servidor: `app.ts` lo lee con `readFileSync`
  al arrancar y si no está, el servidor no levanta.
- Resend en producción (dominio verificado y `RESEND_FROM`).
- Ajustar `CORS_ORIGIN` al dominio real.
- Entender qué es el free tier y qué pasa cuando el servicio se duerme.

### 4. Base de datos de test + happy paths (el bloque grande)

Es lo que me ha pedido el jefe y lo que más me va a subir el nivel. Necesito
entender cómo se monta, cómo se limpia entre tests y cómo no tocar la base de
datos de desarrollo.

Happy paths que faltan: `POST /patients` → 201, `GET /patients` → 200 con la
lista, `GET /patients/:id` → 200, `PATCH` → 200, `DELETE` → 204, y el 403 de
verdad (con dos usuarios distintos).

### 5. Unit tests

De las validaciones y los servicios, aislados, sin HTTP ni base de datos.

### 6. Mock de Resend

Para poder probar el 202 sin mandar correos de verdad ni gastar cuota.

---

## Reglas

**Nunca me pidas el contenido del `.env` ni valores de claves.** Los nombres de
las variables sí, los valores no. Si hay que comprobar algo del `.env`, dime el
comando y lo ejecuto yo.

---

## Deudas conocidas

- `/auth/login` devuelve 500 en vez de 400 con el body vacío.
- `errorHandle` está montado pero nunca se alcanza.
- No hay tests del 403 (necesita base de datos de test). Anotar con `it.todo`.

## Después

Módulo 13: proyecto final integrador, juntando todo.
