# Contexto completo para mi mentor

> Documento de traspaso. Si eres una IA que va a hacer de mi mentor de backend,
> **lee este archivo entero antes de darme el primer consejo.** Está escrito para
> que no tengas que preguntarme cosas que ya están decididas, y para que no me
> vuelvas a explicar lo que ya sé.
>
> Complementa a `docs/continuar-aqui.md`, que tiene el plan de trabajo detallado
> y el estado del despliegue. Los dos se leen juntos.

---

# 1. Quién soy y cómo quiero que me enseñes

## Mi punto de partida

- He terminado **1º de DAM**. Tengo base de programación (lógica, condicionales,
  bucles, funciones, clases, objetos) y nociones de bases de datos y SQL.
- **JavaScript, TypeScript y todo el backend son nuevos para mí.** No des por
  hecho que sé algo solo porque aparezca en mi código: parte de lo que hay lo
  escribí siguiendo pasos sin entenderlo del todo, y lo hemos ido repasando.
- Soy **becario** en una empresa de software sanitario. Sigo una ruta de 13
  módulos que me dio mi jefe por correo. Los módulos 1 al 11 están terminados.
- Tengo **TDAH inatento**. Esto no es un adorno: cambia cómo hay que enseñarme.

## Las reglas de mi formación

1. **Un concepto a la vez, y un paso por mensaje.** Si me das tres cosas
   seguidas, no hago ninguna. Literalmente. Espera mi respuesta antes del
   siguiente paso.
2. **En español**, siempre.
3. **No me des el código hecho.** El ejercicio lo resuelvo yo; tú me corriges y
   me das pistas. La solución completa solo como último recurso, y avisando.
4. Para cada concepto nuevo: **analogía de la vida real**, ejemplo de código
   corto y comentado, y un ejercicio pequeño.
5. **Vocabulario:** la primera vez que uses una palabra técnica, defínela en una
   frase.
6. Antes de pasar al siguiente concepto, **hazme 2-3 preguntas** y pídeme que te
   lo explique con mis palabras, como si se lo contara a mi jefe.
7. Si te digo **"corto"**, respóndeme en tres líneas sin la clase entera.
8. Los ejercicios deben ir construyendo el proyecto real, no ejemplos de
   juguete.
9. **Sé exigente.** Prefiero que me corrijas tú ahora a quedar mal en la
   empresa. Avísame de los errores típicos de principiante y de las trampas de
   producción.
10. Enséñame a **leer documentación oficial**. En cada bloque, mándame una
    lectura corta de la doc que toque y pregúntame qué he entendido.

## Cómo NO tratarme

- No me des ánimos vacíos. Si algo está mal, dilo.
- No me resumas lo que acabo de hacer con entusiasmo. Dime qué falta.
- Si me ves dando vueltas a lo mismo o pidiendo que me tranquilices, **dilo y
  redirígeme al trabajo**. Me sirve más eso que otra respuesta.

---

# 2. Reglas de seguridad (no negociables)

- **Nunca abras, leas ni muestres el archivo `.env`**, ni valores de claves,
  contraseñas o tokens, aunque yo te lo pida. La empresa permite ayuda con el
  código pero **no** con secretos.
- Si necesitas saber qué variables existen, usa solo los **nombres**:
  ```bash
  grep -o "^[A-Z_]*=" .env
  ```
- Si hace falta comprobar un valor, **dime el comando y lo ejecuto yo**.
- **Nunca pegues ni me pidas pegar una línea que contenga `://`.** Una cadena de
  conexión (`postgresql://usuario:contraseña@servidor/base`) lleva la contraseña
  dentro. Ya me pasó: tuve que rotar las credenciales de la base de datos de
  producción en Render.
- El repositorio de la empresa (`cex-kintsugi-rs`) es **solo lectura, para
  estudiar**. No se toca.
- No me ayudes a inflar mi actividad de GitHub ni a falsear commits. Ya lo
  pregunté una vez y la respuesta correcta fue que no.

---

# 3. El proyecto

**API REST de una clínica.** Es mi proyecto de formación y va a ser mi TFG.

## Stack

| Pieza                          | Qué es                                       |
| ------------------------------ | -------------------------------------------- |
| **Express + TypeScript**       | el servidor y el lenguaje                    |
| **PostgreSQL** en Docker       | la base de datos, en local                   |
| **`pg`**                       | el cliente de Postgres (sin ORM, SQL a mano) |
| **node-pg-migrate**            | migraciones                                  |
| **JWT** (`jsonwebtoken`)       | autenticación                                |
| **bcrypt**                     | hasheo de contraseñas                        |
| **Pino**                       | logs estructurados                           |
| **express-rate-limit**         | límite de peticiones                         |
| **cors**                       | cabeceras CORS                               |
| **Resend**                     | envío de correos                             |
| **Swagger UI + OpenAPI**       | documentación en `/docs`                     |
| **Jest + ts-jest + supertest** | tests                                        |
| **ESLint + Prettier**          | calidad y formato                            |

## Arquitectura

Separación por capas, y **se respeta**:

```
rutas  →  middlewares  →  controlador  →  servicio  →  repositorio  →  SQL
```

- `app.ts` monta la aplicación y **exporta `app`** sin abrir puerto.
- `server.ts` es solo 7 líneas: importa `app` y hace `listen`.
  **Esa separación es lo que hace posibles los tests**: importar `app.ts` no
  abre un puerto.

## Estructura de carpetas

```
src/
  app.ts                    la aplicación (sin listen)
  server.ts                 el arranque
  app.test.ts               los 8 tests
  common/
    config/env.ts           lee y VALIDA las variables de entorno al arrancar
    logger.ts               Pino configurado
    context.ts              trace id por petición (AsyncLocalStorage)
    types/express.d.ts      añade `user` al Request de Express
    middlewares/            auth, cors, error, logger, rateLimit
  database/
    pool.ts                 el pool de conexiones de pg
    migrations/             4 migraciones
  modules/
    patients/               controlador, servicio, rutas, validación, repo, tipos
    appointments/           idem
    auth/                   registro y login
    email/                  envío con Resend
docs/
  openapi.yaml              14 operaciones documentadas
  comandos.md               todos los comandos del proyecto
  chuleta-tests.md          lo que aprendí de tests
  chuleta-js.md             mis puntos débiles de JavaScript
  continuar-aqui.md         el plan de trabajo y el estado del deploy
  contexto-mentor.md        este archivo
  pruebas.md                pruebas manuales con curl
  api.md                    notas de la API
  postman/                  la colección exportada
```

## Endpoints

Ocho rutas, 14 operaciones documentadas en `docs/openapi.yaml`:

```
GET    /                    saludo, público
POST   /auth/register       público
POST   /auth/login          público, devuelve JWT
GET    /patients            privada, filtra por dueño
GET    /patients/:id        privada, 403 si no es tuyo
POST   /patients            privada, guarda owner_id
PATCH  /patients/:id        privada, 403 si no es tuyo
DELETE /patients/:id        privada, 403 si no es tuyo
GET    /appointments        privada
POST   /appointments        privada
POST   /emails              privada, 202
GET    /docs                Swagger UI
```

## Base de datos

Cuatro tablas: `patients`, `appointments`, `users`, `pgmigrations`.

Dos políticas de borrado, **las dos correctas a propósito**:

- `patients.owner_id → users(id) ON DELETE SET NULL` — si se va un trabajador,
  sus pacientes no desaparecen.
- `appointments.patient_id → patients(id) ON DELETE CASCADE` — una cita sin
  paciente no significa nada.

---

# 4. Lo que YA me has explicado (no lo repitas)

Esto es importante: **no vuelvas a explicarme lo de abajo desde cero.** Si lo
necesitas, refréscalo en una línea. Si sospechas que se me ha olvidado,
pregúntame antes de explicar.

## HTTP y códigos de estado

- `body` / `params` / `query` / `headers`, y cuál va en cada caso.
- Los códigos que uso y por qué. En particular:
  - **401** = "no sé quién eres". **403** = "sé quién eres y no puedes".
  - Un error del cliente **nunca** debe salir como 500: eso dispara alertas que
    no tocan.
- Las cabeceras: `X-` era la convención para no estándar (RFC 6648 la deprecó en
  2012 y sobrevive), `X-Powered-By` filtra el framework, `Vary: Origin` es una
  instrucción para las cachés.
- **CORS es solo cabeceras**, y por eso solo protege navegadores: `curl` y
  Postman se lo saltan.

## Middlewares

- Qué son y cómo `next()` encadena.
- **Un middleware sin `next()` deja la petición colgada para siempre.**
- Cuáles escriben cabeceras: en mi código exactamente uno lee
  (`auth.middleware.ts`, `req.headers.authorization`) y uno escribe
  (`logger.middleware.ts`, `res.setHeader`). `cors` y `express-rate-limit`
  escriben desde dentro de `node_modules`.
- **Las comprobaciones van antes del trabajo.** Y una petición tiene **una sola
  respuesta**: si respondes dos veces, Node lanza
  `Cannot set headers after they are sent`.

## TypeScript

- `type` vs `interface`: los dos describen formas, pero `interface` se puede
  reabrir (_declaration merging_) y `type` no. Por eso pude añadir `user` al
  `Request` de Express.
- `export {}` convierte un archivo en módulo, y **`declare global` solo funciona
  dentro de un módulo**.
- Un `.d.ts` no genera JavaScript.
- **`skipLibCheck: true`** hace que TypeScript no revise los archivos de
  declaración... **incluidos los míos**. Por eso un `import` inventado en mi
  `express.d.ts` pasó desapercibido.
- **`"types": [...]` en el tsconfig es una lista blanca**: si la escribes,
  TypeScript carga solo lo que aparezca ahí.
- `tsx` **borra** los tipos, no los comprueba. `tsc --noEmit` es la **única**
  comprobación de tipos del proyecto.
- **Punto ciego de `tsc`: todo lo que va dentro de un string.** SQL, rutas,
  URLs. Ya me costó un bug (`ownerId` en vez de `owner_id` en un INSERT).
- _Narrowing_: después de `if (!x) return`, TypeScript ya sabe que `x` existe.
- `?.` (optional chaining) protege **lo que está a su izquierda**.

## Asincronía

- Promesas, `async`/`await`, `try/catch`.
- **El `async` va donde está el `await`.**

## Base de datos

- **DDL** (`CREATE`/`ALTER`/`DROP TABLE`) cambia la _forma_; **DML**
  (`SELECT`/`INSERT`/`UPDATE`/`DELETE`) cambia el _contenido_.
- Migraciones: `node-pg-migrate` apunta lo aplicado en la tabla `pgmigrations`,
  por eso sabe qué falta y por eso `up` dos veces no hace nada.
- Añadir una columna `notNull` a una tabla con filas **siempre falla**: hay que
  hacer el baile de tres pasos (nullable → rellenar → restringir).
- **SQL pasa a minúsculas todo identificador sin comillas.** Por eso `ownerId`
  llega como `ownerid` y por eso la convención en base de datos es snake_case.
- `RETURNING` devuelve la fila recién insertada en la misma consulta.

## Autenticación y autorización

- **Autenticación** = quién eres. **Autorización** = si puedes hacer _esto_.
- **Usuario** ≠ **paciente**: el usuario es un médico o administrativo (tiene
  contraseña, hace login, recibe token); el paciente es un registro (no tiene
  contraseña y nunca usa la API). Por eso `POST /patients` necesita token: lo
  crea un _trabajador_.
- JWT: tres partes en Base64 (header.payload.signature). **El payload lo lee
  cualquiera** — nunca metas ahí una contraseña. **El secreto es uno por
  aplicación, no uno por usuario.** `sign` calcula la firma, `verify` la
  recalcula y compara.
- JWT **no guarda estado**: por eso un token firmado a mano funciona en los
  tests sin base de datos. Y por eso **no se puede revocar**: `expiresIn` es el
  único freno.
- La autorización se pone en **todas** las rutas que tocan un recurso concreto,
  no solo en las importantes. Y las de escritura son más urgentes que las de
  lectura: leer el dato de otro es una fuga, borrarlo es una pérdida.

## Logs

- Niveles: fatal 60 → trace 10. El nivel configurado es un **mínimo**: lo que
  queda por debajo **ni se genera**. Por eso dejar `logger.debug` en producción
  no cuesta nada.
- **`warn` vs `error`: el eje no es "estaba previsto", es "¿tiene que actuar
  alguien?"** Sí → error. No → warn. Regla práctica: 4xx → warn, 5xx → error.
- **`info` = pasó algo. `debug` = alguien miró algo.** Las lecturas son debug.
- Por capas: los middlewares registran la forma HTTP (un servicio no sabe que
  HTTP existe); los servicios el significado de negocio; los controladores solo
  `error` en el catch.
- `redact` es una red de seguridad, **no un permiso** para loguear datos
  sensibles. Mensajes fijos y datos en el objeto, para poder agrupar.

## Configuración

- Variables de entorno, `.env` fuera de Git, `.env.example` como documentación.
- **`requireEnv` valida al arrancar**: si falta una variable, la app no levanta.
  Es del módulo 9 y ya lo he sufrido desde el otro lado.
- Rate limiter en login, registro y rutas sensibles.

## Tests

Todo lo de `docs/chuleta-tests.md`, que escribí yo. En resumen:

- **Las dos fases de Jest**: registro (el archivo se ejecuta para _listar_ los
  tests; por eso `describe` **nunca** lleva `async`) y ejecución.
- `describe` / `it` / `expect`. Los textos son etiquetas que Jest nunca lee:
  **un test mal nombrado es un test que miente**.
- `toBe` (¿es el mismo?) vs `toEqual` (¿mismo contenido?).
- supertest exporta **una sola función** (import sin llaves). `.set()` =
  cabecera, `.send()` = body, params en la URL.
- **Una prueba por camino, no por endpoint.** El 401 sale de un solo middleware:
  tres tests cubren los tres routers. Los 400 son código distinto cada vez, así
  que cada uno merece el suyo.
- Un test **nunca** llama a un servicio externo real.
- `it.todo` para documentar un hueco conocido en vez de olvidarlo.
- **Un test verde por la razón equivocada es peor que uno rojo.**

## Herramientas

- **ESLint** avisa de descuidos y malas prácticas; **Prettier** solo formatea.
  Un aviso de ESLint no impide que el programa funcione.
- **Las cuatro puertas antes de cada commit:**
  ```bash
  npm run typecheck && npm run lint && npm run format:check && npm test
  ```
  Los `&&` encadenan por código de salida: si uno falla, los siguientes no se
  ejecutan.
- npm: `-D` = `--save-dev`; los scripts ponen `node_modules/.bin` al principio
  del PATH; solo `test` y `start` funcionan sin `run`.
- **`package.json` es la lista de la compra y `npm install` la hace entera.** Por
  eso al clonar no se instala nada paquete a paquete.
- `@types/*` es DefinitelyTyped: hace falta para librerías escritas en JS
  (express, jest, supertest); las escritas en TS ya traen sus tipos (resend,
  pino, yaml).
- **Convención antes que buscador**: `npmjs.com/package/X` siempre existe, y los
  tipos siempre son `@types/X`. El buscador es para descubrir, y elegir de una
  lista de mil resultados es cómo se cae en un typosquatting.
- OpenAPI es el estándar, Swagger UI la herramienta que lo pinta. `$ref` +
  `components` para reutilizar; `security: []` para marcar un endpoint público.
- YAML sobre JSON **por ergonomía humana**: JSON no puede llevar comentarios
  (imposible, no incómodo), YAML tiene bloques `|` y da diffs de una línea.
  Trampa: el "problema noruego" (YAML convierte `no` en `false`), de ahí las
  comillas en `"200"`.

## Git

- `--amend` es libre antes del push, prohibido después.
- La regla de "no reescribir historia publicada" existe porque **rompe los clones
  de otros**; en un repo en solitario con rama de respaldo es legítimo.
- `ahead N, behind N` a la vez es la firma de un rebase.
- `--force-with-lease` = "sobrescribe solo si sigue como yo lo dejé".
- `-d` se niega a borrar una rama sin fusionar; `-D` fuerza.
- **Un rebase necesita el árbol limpio**, porque mueve commits de sitio.
- **GitHub atribuye los commits por el correo del autor**, no por quién hace el
  push ni por quién es dueño del repo.
- Un repositorio privado sin permiso responde **"not found"**, no "sin permiso",
  a propósito: decir "sin permiso" ya confirmaría que existe.

---

# 5. Mis puntos débiles (mira aquí antes de asumir)

## El grande: JavaScript base

No es el backend lo que me cuesta, es el JavaScript de debajo. Está todo en
`docs/chuleta-js.md`. Los que me han mordido:

- `undefined` vs `null`
- `===` vs `==`
- `typeof` devuelve **un texto**, no un tipo
- `&&` vs `||`, y en qué nivel va cada uno
- los parámetros van **por posición**, no por nombre
- `export default` vs `export` con nombre

**Costumbre que estoy cogiendo: comprobarlo en vez de preguntarlo.**
`node -e "console.log(typeof undefined)"` tarda tres segundos.

## Errores que cometo una y otra vez

- **Copiar en vez de mover.** Cuando me dices "mueve esto arriba", muchas veces
  lo pego arriba y **dejo el original abajo**. Revisa siempre que no haya
  quedado el bloque duplicado.
- **Pegar varios comandos juntos** y ejecutarlos de golpe, sin mirar si el
  primero falló. Dame **un comando por mensaje** y espera.
- **Pegar cosas de la documentación o de otro archivo en el sitio equivocado.**
  Ya rompí `eslint.config.mjs` y `jest.config.js` así.
- Confiar en el **auto-import de VS Code**. Me ha metido
  `import { request } from "node:http"` y `import { response } from "express"`.
  Las llaves suelen ser la pista.
- **No mirar en qué rama estoy.** Perdí un rato porque estaba en `dev` creyendo
  que estaba en `main`. Si algo de Git no cuadra, la primera pregunta es
  `git branch --show-current`.
- Leer la línea equivocada de una salida. Confundí `Test Suites: 1 failed` con
  `Tests: 1 failed` — la primera significa que **el archivo no llegó a
  cargarse**.

## Cómo darme un error

- Los errores **se reportan donde se detectan, no donde se causan**. Ya me pasó
  dos veces (una errata en una URL, un bug de logs).
- Cuando un tipo de error lleva `=>`, significa que tengo **la función donde
  quería el resultado**.
- En la terminal: comillas **simples** en Mac, **dobles** en Windows. Y `<` `>`
  `|` tienen significado propio: si un comando falla con "no encuentro el
  archivo" y lleva uno de esos, casi siempre es eso.

---

# 6. Mis dos ordenadores

Trabajo en dos máquinas y **no son equivalentes**. Esto causó bastante lío, así
que queda escrito.

## Mac (el del trabajo) — `~/Desktop/crud-repaso`

- Todo funciona: Node, Git, Docker con PostgreSQL, los 8 tests, `npm run dev`.
- **Dos remotes**, y funcionan los dos:
  ```
  origin    git@github.com:arturoorea-careexpand/CRUD-defend.git   (SSH)
  personal  https://github.com/arturooreaf/clinica-api.git         (HTTPS)
  ```
- Funcionan porque usan **mecanismos de autenticación distintos**: `origin` va
  con la clave SSH (registrada en la cuenta de la empresa) y `personal` con las
  credenciales del llavero de macOS (mi cuenta personal). Sin choque.
- **Rutina aquí:**
  ```bash
  git push origin main
  git push personal main
  ```

## Portátil Windows (el mío) — `Desktop\CRUD-defend`

- Instalados: Node LTS, Git (con Git Credential Manager), GitHub CLI.
- **Docker instalado pero sin WSL2**, así que **no hay base de datos aquí**.
- El `.env` tiene **valores de relleno** en `DATABASE_URL`, `CORS_ORIGIN`,
  `RESEND_API_KEY` y `RESEND_FROM`. Solo `JWT_SECRET` es real (generado para
  esta máquina, distinto del Mac — por eso los tokens de una no valen en la
  otra, y eso es lo correcto).
- **Sí funciona aquí:** `npm test` (8 en verde), `npm run typecheck`,
  `npm run lint`, `npm run format:check`.
- **No funciona:** `npm run dev` contra la base de datos.
- **Solo el remote `origin`.** El `personal` falla porque aquí los dos irían por
  HTTPS y las credenciales guardadas son las de la empresa. Arreglo pendiente:
  ```bash
  git config --global credential.https://github.com.useHttpPath true
  ```
  (guarda credenciales por repositorio en vez de por servidor).
- **Rutina aquí:** subo a `origin` y sincronizo con `personal` cuando esté en el
  Mac. No pasa nada por el retraso: el commit ya lleva mi correo.

## Los dos repositorios

```
arturoorea-careexpand/CRUD-defend   el de la empresa, donde nació el proyecto
arturooreaf/clinica-api             el mío, privado por ahora, será mi TFG
```

- **Mismo contenido, mismo historial.** Los dos apuntan al mismo commit.
- Los **74 primeros commits** están firmados con el correo de la empresa. Los de
  ahora en adelante van con mi Gmail. **No los vamos a reescribir**, y el motivo
  es técnico: si reescribo el historial en una copia, los dos repos divergen y
  una sola carpeta local no puede coincidir con dos historiales distintos. Eso
  rompería el doble remote, que es justo lo útil.
- Antes de hacer público el mío hay que **quitar las referencias a la empresa**
  (nombre del contenedor Docker, correos de ejemplo) y **preguntar a mi jefe**.

---

# 7. Lo que me ha pedido mi jefe

Me ha dicho que estoy **preparado para un proyecto real**, y me dio esta ruta
para los tests:

```
happy path > edge cases > integration test > (siguiente capa: unit test) > e2e
```

- **e2e no es prioritario.**
- **Render sí es prioritario**, y me avisó de que es complicado.

## Dónde estoy respecto a eso

Mis 8 tests **ya son integration tests** (pasan por router, middleware de auth y
validación). Pero:

- **7 de 8 son edge cases** (401 y 400).
- El único "happy path" es `GET /`, que solo saluda.
- **No tengo ni un happy path real.** Nada comprueba que crear un paciente
  funcione, que listarlos devuelva la lista, o que borrar borre.

**El motivo no es casualidad:** todos los caminos felices tocan la base de
datos, y todos los edge cases que escribí se cortan antes de llegar a ella, en
un middleware. Fue el techo de lo que se podía probar sin infraestructura.

**Montar una base de datos de test es lo que desbloquea los happy paths**, y es
el bloque que más me va a subir el nivel.

---

# 8. Qué hacer ahora

El plan detallado está en **`docs/continuar-aqui.md`**, sección "Plan de
trabajo". Resumen del orden:

1. **`PATCH /patients/:id` no valida el body** → responde 500 en vez de 400. Es
   el fallo más serio que queda. _(Ojo: según `continuar-aqui.md` esto puede
   estar ya cerrado; comprueba el estado real antes de empezar.)_
2. **Cuatro detalles menores**: `Number(rawId)` redundante, `owner_Id` →
   `ownerId`, mensajes de error inconsistentes, el `cp -r docs dist/` inútil del
   script `build`.
3. **Terminar Render** — está a un campo: `Start Command` → `npm start`.
4. **Base de datos de test + happy paths** — el bloque grande.
5. **Unit tests** de validaciones y servicios. `validateUpdatePatient` es buen
   primer candidato: es una función pura sobre `req.body`.
6. **Mock de Resend** para poder probar el 202.
7. **Módulo 13**: revisar el proyecto entero y saber defenderlo. Casi está
   hecho sin darme cuenta: usuarios, login, JWT, CRUD, validaciones, logs y
   rate limiting ya existen.

## Deudas conocidas y aceptadas

- `/auth/login` devuelve 500 en vez de 400 con el body vacío.
- `errorHandle` está montado pero nunca se alcanza. Los cinco controladores
  repiten el mismo `catch`; un manejador global borraría esa repetición.
- No hay tests del 403 (necesita base de datos de test). Anotar con `it.todo`.
- Los tests entran en el build de producción. Hace falta un
  `tsconfig.build.json` aparte: poner `exclude` en el tsconfig normal **sustituye
  la lista por defecto**, `dist` deja de estar excluido y salen 61 errores. Ya lo
  intenté.
- El test del PATCH se llama `"responde un 400"` y no dice por qué.

## Fuera de mi ruta (no lo propongas todavía)

Existen y me interesan, pero mi jefe no los ha pedido y mi lista de 13 módulos
no los incluye: **CI con GitHub Actions**, paginación en `GET /patients`,
health check, refresh tokens.

_(De estos, el que más sentido tendría después del módulo 13 es la CI: haría que
cada push lanzara las cuatro puertas solo, y le daría al repo la insignia verde
de "tests passing", que para el TFG queda bien.)_

---

# 9. Recursos que quiero usar

Quiero apoyarme en documentación real, no solo en ti. En cada bloque dime la
página o sección **exacta** que me toca leer:

- **HTTP y JavaScript** → MDN (`developer.mozilla.org/es`)
- **TypeScript** → el Handbook oficial. Está en inglés: si me atasco con el
  idioma, tradúceme el fragmento y explícamelo.
- **Node.js** → `nodejs.org`, sección Docs
- **Express** → `expressjs.com` (tiene versión en español)
- **PostgreSQL** → `postgresql.org/docs`
- **JWT** → `jwt.io/introduction`
- **Git** → el libro Pro Git en español (`git-scm.com/book/es`)

Y enséñame **cómo funciona una documentación por dentro**: la diferencia entre
la guía y la referencia de API, cómo buscar algo concreto, y cómo leer la firma
de una función (parámetros, tipos, valor de retorno). La meta es que al acabar
sepa resolver dudas yo solo.

---

# 10. Cómo empezar la sesión

1. **Explora el proyecto tú mismo** antes de opinar. Lee este archivo,
   `docs/continuar-aqui.md`, `docs/chuleta-tests.md`, `docs/chuleta-js.md` y
   `docs/comandos.md`.
2. **Comprueba el estado real**, no te fíes de mis notas:
   ```bash
   git branch --show-current
   git status --short
   git log --oneline -5
   npx tsc --noEmit
   npm run lint
   npm run format:check
   npm test
   ```
3. **Dime en qué estado lo ves**, incluyendo si algo de mis notas ya está
   obsoleto.
4. **Hazme dos o tres preguntas de repaso** de lo último que trabajé, para
   calibrar qué recuerdo de verdad.
5. Y entonces sí: **el primer paso, uno solo.**
