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

### 2. Desplegar en Render (módulo 12) — TERMINADO (08/09/2026)

**La API está en producción y verificada:** https://crud-defend.onrender.com

Montaje:

- Workspace `Clinica-API`. Base de datos **`crud-defend-db`** (PostgreSQL 18,
  Frankfurt, Free). **Caduca el 7 de octubre de 2026** (+14 días de margen).
- Migraciones aplicadas contra producción desde el Mac con la URL **externa** y
  `?sslmode=require`. Desde dentro de Render no hace falta: va por red privada.
- Servicio web `CRUD-defend`, rama `main`, **misma región que la base** (si no,
  no se ven), plan Free.
- `Build Command`: `npm install --include=dev && npm run build`. El
  `--include=dev` es necesario porque TypeScript es una devDependency.
- `Start Command`: `npm start`.
- **Cinco** variables de entorno (no nueve): `CORS_ORIGIN`, `DATABASE_URL` (la
  **interna**), `JWT_SECRET` (generado, distinto del local), `RESEND_API_KEY`,
  `RESEND_FROM`. Las tres `POSTGRES_*` son solo del `docker-compose` local y
  `PORT` la pone Render.
- Permisos de GitHub restringidos: Render solo ve `CRUD-defend`, no los repos de
  la empresa.

Comprobado, en este orden:

1. `GET /` → _Bienvenido a Careexpand_.
2. `/docs` → carga el Swagger. Esto prueba que `openapi.yaml` llegó al servidor:
   `app.ts` lo lee con `readFileSync` al arrancar, y sin él no levanta.
3. `POST /auth/register` → 201 con el usuario. Prueba la cadena entera hasta la
   tabla `users`.
4. `POST /auth/login` → devuelve token. Prueba bcrypt y el `JWT_SECRET` nuevo.

**Ahora tengo dos entornos con el mismo código:** `localhost:3000` con Docker, y
Render. Lo que cambia entre ellos son exactamente las cinco variables.

#### Cuatro despliegues fallidos, y lo que enseñó cada uno

1. `Running build command 'npm start'` → tenía el comando de arranque en la
   casilla del build. `dist/` no existía porque nadie la había fabricado.
2. `Running 'node index.js'` → no había guardado el Start Command.
3. y 4. `La variable de entorno CORS_ORIGIN no está definida` → **la variable
   existía, pero con el valor vacío.** Mi `requireEnv` hace `if (!value)`, y
   **la cadena vacía es falsy**, así que da el mismo error que si no existiera.
   El mensaje miente en ese caso. Perdí tres intentos revisando **nombres**
   cuando el fallo estaba en el **valor**.

> Truco del panel: en Render, el enlace **Generate** solo aparece en las casillas
> **vacías**. Las que tienen valor muestran los iconos de copiar y de ojo. Se ve
> de un vistazo cuáles faltan.

> Y `Generate` solo sirve para `JWT_SECRET`. Las demás tienen un valor concreto
> que no se puede inventar.

También cacé una errata que **no** habría roto nada al arrancar:
`CORS_ORIGIN` terminaba en `...onrender.comA`. Texto no vacío, así que
`requireEnv` lo daba por bueno y el servidor levantaba. El fallo habría salido
semanas después, con el navegador bloqueando peticiones por CORS.
**Un error que se calla es peor que uno que revienta.**

#### Pendiente de este bloque

- **Sacar los tests del build de producción** con un `tsconfig.build.json`
  aparte. No vale poner `exclude` en el `tsconfig.json` normal: al escribir mi
  propia clave `exclude` sustituyo la lista por defecto, `dist` deja de estar
  excluido y salen 61 errores. Ya lo intenté.
- **Resend**: `RESEND_FROM` es `onboarding@resend.dev`, la dirección de pruebas.
  Solo puedo mandarme correos a mí mismo. Para enviar de verdad hace falta
  verificar un dominio con registros DNS.
- **`CORS_ORIGIN`** apunta a la propia API porque todavía no hay frontend.
  Cuando lo haya, cambiarlo. Ojo: el middleware hace `CORS_ORIGIN.split(",")`,
  espera una lista de direcciones, y `*` ahí **no** funciona como comodín.
- El servicio gratuito **se duerme a los 15 minutos** sin tráfico y tarda cerca
  de un minuto en despertar. La primera petición tras un rato parece un fallo.
- El usuario `demo@careexpand.com` de producción tiene una contraseña conocida.
  Es de prueba y la base es desechable, pero **no meter ahí nada real**.

### Cómo leer un log de despliegue

Es cronológico y narra lo que hace. La línea que empieza por
`==> Running build command '...'` o `==> Running '...'` dice **literalmente qué
comando ejecutó**. Los dos fallos de hoy se resolvían leyendo solo esa línea:

1. `Running build command 'npm start'` → tenía el comando de arranque en la
   casilla del build. `dist/` no existía porque nadie la había fabricado (está
   en `.gitignore`, así que tampoco viaja a GitHub).
2. `Running 'node index.js'` → no había guardado el Start Command.

Y cuando el error **cambia de sitio**, es que lo anterior ya está arreglado.

### Metedura de pata que no debo repetir

Pegué en el chat la `DATABASE_URL` completa **dos veces**. Una cadena de
conexión lleva la contraseña dentro:

```
postgresql://USUARIO:CONTRASEÑA@SERVIDOR/BASE
```

No es una dirección, es una credencial entera. Tuve que rotar las credenciales
en Render (_Credential Rotation → New default credential_, y borrar la vieja).

**Regla: nunca pegar una línea que contenga `://`.** Al copiar del terminal,
empezar a seleccionar **debajo** de la línea del comando.

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
