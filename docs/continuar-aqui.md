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

## Lo que me han pedido aprender

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

## Hecho el 08/09/2026

### Despliegue terminado y verificado

`https://crud-defend.onrender.com` en pie. Detalle completo en el punto 2.
El ciclo **commit → push a `main` → despliegue automático → producción** está
funcionando: _Auto-Deploy_ está en _On Commit_, así que **`git push origin main`
ya no es guardar, es desplegar**. Por eso ahora sí trabajo en ramas
`feature/...` y solo integro en `main` cuando las cuatro puertas están verdes.

### Los cuatro detalles del punto 1, cerrados

Ver punto 1. Tres commits separados, uno por tema.

### Observabilidad — la pregunta de mi jefe (ABIERTO)

Mi jefe me preguntó **por qué la base de datos no sale en los logs** y dónde ver
los `debug`. Lo investigué:

Tengo 41 llamadas al logger repartidas así:

- `logger.middleware` → una línea por petición (método, url, status, ms).
- **Servicios** → eventos de negocio ("Paciente creado", "Login correcto").
- **Controladores** → los errores de los `catch`.
- **Repositorios** → **cero. Ni una.**

Y el repositorio es justo la capa que habla con la base. Mis `pool.query(...)`
no registran nada y `pg` tampoco lo hace solo. Por eso el log dice _"llegó un
PATCH y devolvió 400"_ pero nunca _"se ejecutó este SQL, con estos parámetros,
en 12 ms"_. **Cuando algo va lento en producción casi siempre es la base, y
ahora mismo no tengo forma de verlo.**

Sobre los `debug`: tengo cinco, en los servicios. Mi `logger.ts` línea 7 pone
`level: isDevelopment ? "debug" : "info"`. Un nivel de log es un **umbral**, no
un filtro: con `info` veo info, warn, error y fatal, y `debug` y `trace` quedan
por debajo. Así que en local se ven y en producción no, y eso es deliberado.

**COMPROBADO Y CORREGIDO (08/09/2026):** la sospecha era cierta. `NODE_ENV` no
estaba entre mis cinco variables de Render, así que `NODE_ENV !== "production"`
daba **verdadero** y mi API creía estar en desarrollo. Consecuencias en
producción: nivel `debug` en vez de `info`, y **`pino-pretty` activo**, que es
lento (levanta un worker) y rompe la agregación de logs (Render y cualquier
recolector esperan una línea JSON por evento para poder filtrar por campo; con
texto coloreado, `traceId` deja de ser un campo consultable).

Arreglado añadiendo `NODE_ENV=production` en el panel de Render. Sin tocar
código: el `logger.ts` ya estaba bien escrito, solo faltaba decirle al servidor
dónde estaba.

**Tarea que sale de aquí:** instrumentar la capa de repositorio para que el SQL
y su duración aparezcan en el log.

**Y la decisión que hay que tomar antes de escribir esa instrumentación:** qué
se registra exactamente.

```
la consulta      "SELECT * FROM patients WHERE owner_id = $1"   → útil, sin riesgo
la duración      12 ms                                          → útil, sin riesgo
los parámetros   ["Ana Ruiz", 34, "hipertensión"]                → DATOS DE PACIENTE
```

En una API sanitaria, registrar los parámetros mete datos clínicos en unos logs
que se copian, se agregan y los ve gente de operaciones. Es justo lo que el
módulo 10 llama "no registrar nunca datos sensibles". **Registrar consulta y
duración, nunca valores.**

---

## Hecho el 09/09/2026

### Revision de estado real (con IA de mentor)

- `git branch/status/log`, `tsc --noEmit` y `npm run lint` en verde. `npm test`
  no se pudo verificar en ese momento (entorno de revision sin Docker a
  mano); pendiente confirmarlo en local.
- **Hallazgo importante**: el commit `1bcdb33` ("test: add happy path
  integration tests for patients", hecho el 08/09 pero no anotado aqui) ya
  anadio un `beforeEach` global con
  `TRUNCATE TABLE users, patients, appointments CASCADE` mas tres tests de
  happy path (`POST /patients`, `GET /patients`, `GET /patients/:id`). Corria
  contra `pool`, el mismo de siempre -- sin base de test separada, asi que
  cada `npm test` habria vaciado la base de **desarrollo**.
- Al ser `beforeEach` global (fuera de cualquier `describe`), afecta tambien a
  los tests viejos de edge cases: ahora **todos** los tests, no solo los
  nuevos, necesitan Docker levantado para pasar. Antes no.

### Decisiones tomadas hoy

- **Donde vive la base de test**: misma instancia de Postgres del
  `docker-compose` (contenedor `patients-careexpand-db`), otra base logica:
  `clinica_test`, separada de `BBDDcareexpand` (desarrollo). Se descarto un
  contenedor de test aparte por ahora -- no hay CI compartida todavia, es
  sobra de infraestructura para el tamano actual del proyecto.
- **Como limpiarla entre tests**: se mantiene el patron que ya estaba escrito,
  `TRUNCATE ... CASCADE` en `beforeEach` -- es el estandar razonable a esta
  escala. Transaccion + rollback se descarto por ahora: exigiria que toda la
  app comparta un mismo cliente `pg` inyectado, que no esta montado.
- Base `clinica_test` ya creada en el contenedor.
- `.env.test` creado (copia de `.env`) con `DATABASE_URL` apuntando a
  `clinica_test` en vez de `BBDDcareexpand`. Anadido a `.gitignore` (antes
  solo cubria `.env` a secas).
- `docs/comandos.md` ampliado: como listar bases del contenedor, que es cada
  una, como crear una base nueva, y por que las comillas simples/dobles en
  los `docker exec ... sh -c '...'`.

### Pendiente de hoy, sin resolver todavia

- **Aun no comprobado**: si `clinica_test` ya tiene las tablas (migraciones
  aplicadas) o hace falta correr `npm run migrate up` ahi con `DATABASE_URL`
  apuntando a esa base.
- **Aun no hecho**: que Jest cargue `.env.test` en vez de `.env` al ejecutar
  `npm test` (falta la configuracion, no basta con que el archivo exista).
- **Aun no corregido a mano**: en el test de `GET /patients`, hay dos
  `INSERT` metidos en una sola llamada a `pool.query`, separados por `;` --
  deberia ser SQL parametrizado, uno a uno, como el resto del proyecto.
- El bloque de "crear usuario" se repite igual en los tres tests nuevos --
  queda para el modulo de fixtures (punto 4 del plan), no es prioridad ahora
  mismo.
- Se encontro un archivo `.git/index.lock` residual (de una herramienta de
  revision) -- si algun `git` da error de "Unable to create .git/index.lock:
  File exists", borrarlo a mano: `rm .git/index.lock`.

---

## Plan de trabajo, en orden

### 1. Cuatro detalles pendientes — TERMINADO (08/09/2026)

- `Number(rawId)` redundante eliminado en las cinco funciones del controlador.
  `req.user?.userId` ya es `number` según `UserPayload` en `express.d.ts`; lo
  que **sí** hace falta convertir es `req.params.id`, porque una URL es texto.
- `owner_Id` → `ownerId` en el repositorio. La convención es **snake_case para
  SQL, camelCase para TypeScript**, y el repositorio es la frontera entre los
  dos mundos: dentro del string va `owner_id` (nombre de columna) y fuera
  `ownerId` (variable). `owner_Id` no era ninguna de las dos.
- Seis mensajes de error unificados. Uno no era cosmético: el 403 del `DELETE`
  decía "modificar".
- `"build": "tsc && cp -r docs dist/"` → `"tsc"`. El `cp` era inútil y lo
  **comprobé** antes de quitarlo: `app.ts` hace
  `path.join(__dirname, "../docs/openapi.yaml")`, y tanto desde `src/` como
  desde `dist/` eso resuelve a la carpeta `docs/` de la raíz. La copia de
  `dist/docs/` no la leía nadie.

> **Queda un resto:** `src/modules/patients/patient.service.ts` líneas 9-11
> todavía usan `owner_Id`. El renombrado se quedó a medias en la capa de
> servicio. Cambiarlo.

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

### 3. Base de datos de test + happy paths (EL SIGUIENTE, el bloque grande)

Es lo que me pidió mi jefe y lo que más nivel me va a dar.

**El problema.** Mis 8 tests esquivan la base de datos: todos comprueban 401 y
400, y esos se resuelven antes de llegar al SQL (por eso pasan sin Docker
levantado). Pero un `POST /patients` que devuelve 201 **tiene** que escribir una
fila, y un `DELETE` que devuelve 204 tiene que borrarla.

**Por qué hace falta una base aparte, y no la de desarrollo:**

1. Cada `npm test` me borraría mis datos.
2. Peor: un test como _"listar pacientes devuelve la lista"_ pasaría o fallaría
   según lo que hubiera dentro ese día. **Un test no puede depender del estado
   del mundo**; tiene que arrancar siempre desde el mismo punto conocido. Un
   test que a veces pasa y a veces no deja de ser una prueba y pasa a ser un
   rumor.

**La palanca que ya sé usar:** toda mi app decide a qué base se conecta en un
solo punto, `src/database/pool.ts`, a partir de `DATABASE_URL`. Ya usé eso para
lanzar las migraciones contra Render desde mi portátil poniendo la variable
delante del comando. Los tests son el mismo truco.

**Donde estoy con estas decisiones (actualizado 09/09/2026):**

- listo Donde vive la base de test -> otra base logica en el mismo Postgres:
  `clinica_test`.
- pendiente Como apuntar Jest a ella sin tocar mi `.env` de desarrollo -> tengo
  `.env.test` creado, pero Jest todavia no lo esta cargando. Siguiente paso.
- pendiente Como crear las tablas ahi -> sin confirmar si `clinica_test` ya
  tiene las migraciones aplicadas.
- listo **Como dejarla limpia entre tests** -> me quedo con
  `TRUNCATE ... CASCADE` en `beforeEach`, que ya tenia escrito; solo falta
  que apunte a la base correcta.
- pendiente Como crear los datos que un test necesita (un usuario y su token)
  sin repetir el mismo bloque en cada prueba -> sigue sin resolver.

**Happy paths que faltan:** `POST /patients` → 201, `GET /patients` → 200 con la
lista, `GET /patients/:id` → 200, `PATCH` → 200, `DELETE` → 204, y el **403 de
verdad**, con dos usuarios distintos, que hoy no puedo probar.

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
- **`X-Powered-By` sigue activo.** No tengo `app.disable("x-powered-by")` en
  `app.ts`, así que mi API va anunciando que corre Express y con qué framework
  buscar vulnerabilidades. Es una línea, justo después del `const app =
express()`.
- **Queda un resto de `owner_Id`** en `patient.service.ts` líneas 9-11
  (`listPatients`). El renombrado se quedó a medias en la capa de servicio.
- `GET /` devuelve `"Bienvenido a Careexpand"`, y el contenedor Docker se llama
  `patients-careexpand-db`. **Si el repo va a ser público, esas referencias hay
  que cambiarlas** y preguntar antes.
- `/docs` es **público** en producción: cualquiera ve toda la superficie de la
  API. Para un TFG es lo que quiero; para una API sanitaria real iría detrás de
  autenticación o no se desplegaría. Es una decisión, no un descuido, pero hay
  que saber justificarla.

## Después

Módulo 13: proyecto final integrador, juntando todo.
