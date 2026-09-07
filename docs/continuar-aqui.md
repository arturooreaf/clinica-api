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

**Un paso por mensaje.** Si me das tres cosas a la vez, no hago ninguna.

---

## Estado del proyecto

API REST con Express + TypeScript + PostgreSQL (Docker), JWT, bcrypt, Pino,
rate limiting, CORS, Swagger en `/docs` y **8 tests** con Jest + supertest.

- Módulos 1 a 11 de mi ruta: **terminados**.
- **Autorización terminada.** Las cinco rutas de `/patients` comprueban el dueño
  (`owner_id`): el listado filtra en el SQL, y `GET /:id`, `PATCH` y `DELETE`
  devuelven 401 → 400 → 404 → 403 en ese orden.
- **Validación del PATCH terminada** (ver abajo).
- Rama `main`, árbol limpio. `typecheck`, `lint`, `format:check` y `test` pasan.

---

## Lo que me ha pedido mi jefe

Me ha dicho que estoy preparado para un proyecto real y me ha dado esta lista:

```
happy path > edge cases > integration test > (siguiente capa: unit test) > e2e
```

- **e2e no es prioritario.**
- **Render sí es prioritario**, y me ha avisado de que es complicado.

**Dónde estoy respecto a eso:** mis 8 tests son integration tests, pero
**7 de 8 siguen siendo edge cases** (401 y 400). El único "happy path" es `GET /`
que solo saluda. **Sigo sin un happy path real**: nada comprueba que crear un
paciente funcione, que listarlos devuelva la lista, o que borrar borre.

El motivo es que **no hay base de datos de test**, y todos los caminos felices
tocan la base de datos. Montarla es lo que desbloquea los happy paths.

---

## Hecho el 07/09/2026

### Validación del PATCH — cerrado

`validateUpdatePatient` en `patient.validation.middleware.ts`, montado en el
PATCH de `patient.routes.ts`. Dos reglas:

- Cada campo es **opcional**, pero si viene tiene que ser del tipo correcto.
  El interruptor es `campo !== undefined &&` delante del `typeof`.
- Si **no viene ninguno** de los tres, también es 400.

Test nuevo en `app.test.ts`: `PATCH /patients/1` con `{ name: 123 }` → 400.
No necesita base de datos, porque el middleware corta antes del controlador.

`docs/openapi.yaml` documenta ahora las **tres causas** del 400 del PATCH
(id, body vacío, tipo incorrecto) con un ejemplo cada una.

### Dos bugs cazados que no estaban en el plan

**Un 400 donde tocaba un 404.** En `updatePatient` había un `400` para
"paciente no encontrado", cuando el GET y el DELETE devuelven `404` para el
mismo caso. Estaba puesto porque "así los tests pasaban" — pero **ningún test
tocaba el PATCH**, así que ese cambio no afectaba a `npm test` en absoluto. Lo
único que hacía era mentirle al cliente. Revertido a 404.

> Lección: un test verde por la razón equivocada es peor que uno rojo. Y antes
> de aceptar que "esto arregla los tests", comprobarlo: era un `grep`.

**Los tests se ejecutaban dos veces.** `npm test` decía 16 en vez de 8. `tsc`
compilaba también `app.test.ts` a `dist/app.test.js`, y Jest ejecutaba los dos
archivos. La copia de `dist` era **vieja**, así que la mitad de mis tests estaba
probando una versión congelada de la app. Resuelto con `testPathIgnorePatterns`
en `jest.config.js`.

### Mi punto débil, identificado

No es backend: es **JavaScript base**. `undefined` vs `null`, `===` vs `==`,
`||` vs `&&`, que `typeof` devuelve un texto, que los parámetros van por
posición. Lo he recogido todo en **`docs/chuleta-js.md`**, con los errores
concretos y el mensaje de error que dio cada uno.

**Costumbre a coger:** comprobarlo en vez de preguntarlo.
`node -e 'console.log(typeof undefined)'` tarda tres segundos.

---

## Plan de trabajo, en orden

### 1. Cuatro detalles pendientes (~15 min)

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

Luego `npm test`, las cuatro puertas y commit.

### 2. Desplegar en Render (módulo 12)

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
- **Sacar los tests del build de producción** con un `tsconfig.build.json`
  aparte. Ojo: no vale poner `exclude` en el `tsconfig.json` normal — al
  escribir mi propia clave `exclude` sustituyo la lista por defecto, `dist` deja
  de estar excluido y salen 61 errores. Ya lo intenté.
- Resend en producción (dominio verificado y `RESEND_FROM`).
- Ajustar `CORS_ORIGIN` al dominio real.
- Entender qué es el free tier y qué pasa cuando el servicio se duerme.

### 3. Base de datos de test + happy paths (el bloque grande)

Es lo que me ha pedido el jefe y lo que más me va a subir el nivel. Necesito
entender cómo se monta, cómo se limpia entre tests y cómo no tocar la base de
datos de desarrollo.

Happy paths que faltan: `POST /patients` → 201, `GET /patients` → 200 con la
lista, `GET /patients/:id` → 200, `PATCH` → 200, `DELETE` → 204, y el 403 de
verdad (con dos usuarios distintos).

### 4. Unit tests

De las validaciones y los servicios, aislados, sin HTTP ni base de datos.
`validateUpdatePatient` es un buen primer candidato: es una función pura sobre
`req.body`.

### 5. Mock de Resend

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
- El test del PATCH se llama `"responde un 400"` y no dice **por qué**.
  Renombrarlo a algo como `"devuelve un 400 si name no es un string"`.
- No hay tests del 403 (necesita base de datos de test). Anotar con `it.todo`.
- Los tests siguen entrando en el build de producción (ver punto 2).

## Después

Módulo 13: proyecto final integrador, juntando todo.
