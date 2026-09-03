# Dónde me quedé

> Nota para retomar la formación en una sesión nueva. Pegar al empezar el chat.

## Cómo quiero que me enseñes

Sé mi mentor de backend, **en español** y **poco a poco, un concepto a la vez**.
Vengo de 1º de DAM: tengo base de programación y SQL, pero JavaScript,
TypeScript y backend son nuevos para mí. Tengo TDAH inatento, así que no me
vuelques la teoría de golpe.

Para cada concepto: explicación con una analogía real, ejemplo de código corto
y comentado, y un ejercicio que **resuelvo yo**. **No me des el código hecho**:
corrígeme y dame pistas. La solución completa solo como último recurso.
Si te digo "corto", contéstame en tres líneas sin la clase entera.

## Estado del proyecto

- Módulos 1 a 11 de la ruta: **terminados**.
- **Autorización: terminada.** Las cinco rutas de `/patients` comprueban el
  dueño (`owner_id`): el listado filtra en el SQL, y `GET /:id`, `PATCH` y
  `DELETE` devuelven 401 → 400 → 404 → 403 en ese orden.
- Rama: `main`, árbol limpio, todo commiteado.
- Las tres puertas de calidad pasan: `npx tsc --noEmit`, `npm run lint`
  y `npm run format:check`.

## Pendiente antes de desplegar

1. **`PATCH /patients/:id` no valida el body.** `POST` tiene
   `validateCreatePatient` en `patient.routes.ts`, `PATCH` no. Con
   `{"age": "treinta"}` la petición llega al SQL, Postgres rechaza el texto en
   una columna `integer` y responde **500 en vez de 400**. Es el fallo más
   serio que queda.
2. `Number(rawId)` es redundante en cuatro sitios del controlador: `userId` ya
   es `number` según `UserPayload` en `express.d.ts`.
3. `owner_Id` en `patient.repository.ts` (línea 10) debería ser `ownerId`.
   snake_case es para SQL, camelCase para TypeScript.
4. Mensajes de error inconsistentes: `"No autenticado "` con espacio de más,
   `"el id debe ser un numero"` sin mayúscula ni tilde, y el 403 del `DELETE`
   dice "modificar" cuando debería decir "borrar".
5. `"build": "tsc && cp -r docs dist/"` — ese `cp` es inútil. `app.ts` lee
   `path.join(__dirname, "../docs/openapi.yaml")`, que compilado apunta a la
   raíz del proyecto, no a `dist/docs`.
6. Comprobar que `npm test` sigue en verde (7 tests).

## Módulo 12: desplegar en Render

Es lo siguiente y es lo que quiero hacer ahora.

Lo que ya está hecho:

- `server.ts` usa `process.env.PORT ? Number(process.env.PORT) : 3000`.
- `package.json` tiene `"build"` y `"start": "node dist/server.js"`.
- `tsconfig.json` tiene `rootDir: "./src"` y `outDir: "./dist"`.

Lo que falta y no sé hacer:

- Crear el servicio en Render y conectarlo al repositorio de GitHub.
- La base de datos PostgreSQL en producción. En local uso Docker; en Render no
  sé cómo va ni de dónde sale la `DATABASE_URL`.
- Meter las nueve variables de entorno en el panel de Render:
  `PORT`, `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
  `JWT_SECRET`, `CORS_ORIGIN`, `RESEND_API_KEY`, `RESEND_FROM`.
- Ejecutar las migraciones contra la base de datos de producción.
- Comprobar que `docs/openapi.yaml` llega al servidor: `app.ts` lo lee con
  `readFileSync` al arrancar, y si no está, el servidor no levanta.
- Que Resend funcione en producción (dominio verificado y `RESEND_FROM`).
- Ajustar `CORS_ORIGIN` al dominio real de producción.

**Importante: nunca me pidas el contenido del `.env` ni valores de claves.**
Los nombres de las variables sí, los valores no. Si hay que comprobar algo del
`.env`, dime el comando y lo ejecuto yo.

## Deudas conocidas y aceptadas

- No hay tests del 403 (haría falta una base de datos de test). Anotarlo con
  `it.todo` para que sea una deuda visible y no un olvido.
- No hay mock de Resend, así que no se puede probar el 202.
- `/auth/login` devuelve 500 en vez de 400 con el body vacío.
- `errorHandle` está montado pero nunca se alcanza.

## Después

Módulo 13: proyecto final integrador (usuarios, login, JWT, CRUD,
validaciones, logs y rate limiting, todo junto y funcionando).
