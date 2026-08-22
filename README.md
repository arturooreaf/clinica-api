# CRUD Careexpand — API de pacientes y citas

API REST construida con Node, TypeScript y Express, con PostgreSQL en Docker.
Proyecto de formación: gestiona pacientes, citas y autenticación de usuarios.

---

## Stack

| Tecnología | Para qué |
| --- | --- |
| **Node + TypeScript** | Entorno de ejecución y tipado estático |
| **Express 5** | Framework HTTP: rutas y middlewares |
| **PostgreSQL 16** | Base de datos relacional, en un contenedor Docker |
| **JWT + bcrypt** | Autenticación y hasheo de contraseñas |

---

## Dependencias

### Producción (`dependencies`)

| Paquete | Para qué |
| --- | --- |
| `express` | Framework HTTP: enrutado, middlewares, `req`/`res` |
| `pg` | Cliente de PostgreSQL. Aporta el pool de conexiones y las consultas parametrizadas |
| `bcrypt` | Hashea las contraseñas al registrar y las compara al iniciar sesión |
| `jsonwebtoken` | Firma los JWT en el login y los verifica en el middleware de autenticación |
| `dotenv` | Carga el fichero `.env` dentro de `process.env` |
| `cors` | Añade las cabeceras CORS y responde al preflight `OPTIONS` |
| `express-rate-limit` | Limita las peticiones por IP. Devuelve 429 al superarlas |
| `pino` | Logger estructurado. Escribe los logs en JSON con nivel y marca de tiempo |

### Desarrollo (`devDependencies`)

| Paquete | Para qué |
| --- | --- |
| `typescript` | Compilador y comprobación de tipos |
| `tsx` | Ejecuta TypeScript sin compilar antes. Con `watch`, recarga al guardar |
| `node-pg-migrate` | Sistema de migraciones de la base de datos |
| `pino-pretty` | Formatea los logs de Pino de forma legible. Solo en local |
| `prettier` | Formateo automático del código |
| `@types/*` | Definiciones de tipos para las librerías escritas en JavaScript |

> **Criterio:** en `dependencies` va lo que el servidor necesita **ejecutándose**.
> En `devDependencies`, lo que solo hace falta **mientras se desarrolla**.
> Al desplegar se instala con `npm ci --omit=dev`.

---

## Estructura

```
src/
├── server.ts                  Punto de entrada. Monta middlewares y rutas
├── common/                    Lo compartido por varios módulos
│   ├── config/env.ts          Carga y valida las variables de entorno
│   ├── logger.ts              Instancia de Pino
│   ├── middlewares/           cors, logger, rateLimit, auth, error
│   └── types/                 Extensiones de tipos (Request.user)
├── database/
│   ├── pool.ts                Pool de conexiones a PostgreSQL
│   └── migrations/            Histórico de cambios del esquema
└── modules/                   Un dominio de negocio por carpeta
    ├── patients/
    ├── appointments/
    └── auth/
```

Cada módulo sigue la misma forma:

```
<modulo>/
├── <modulo>.routes.ts         Qué URL llama a qué función
├── <modulo>.controller.ts     Traduce entre HTTP y la aplicación
├── <modulo>.service.ts        Reglas de negocio
├── types/                     Interfaces del dominio
└── infra/repositories/        Acceso a la base de datos (SQL)
```

**Criterios de organización:**

- Si un archivo lo usa **un solo módulo**, vive dentro de ese módulo.
  Si lo usan **varios**, vive en `common/`.
- Las dependencias van **de los módulos hacia `common/`**, nunca al revés.
- El controlador conoce HTTP, el servicio conoce el negocio y el repositorio
  conoce SQL. Ninguna capa invade la de al lado.

---

## Puesta en marcha

**1. Variables de entorno.** Copiar la plantilla y rellenarla:

```bash
cp .env.example .env
```

| Variable | Ejemplo |
| --- | --- |
| `DATABASE_URL` | `postgres://usuario:clave@localhost:5433/basededatos` |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | Credenciales del contenedor |
| `JWT_SECRET` | Cadena aleatoria. Generar con `openssl rand -base64 32` |
| `CORS_ORIGIN` | Orígenes permitidos, separados por comas |

La aplicación **no arranca** si falta alguna: se validan todas al inicio.

**2. Base de datos:**

```bash
docker compose up -d
```

**3. Migraciones:**

```bash
npm run migrate up
```

**4. Servidor:**

```bash
npm run dev
```

Escucha en `http://localhost:3000`.

---

## Endpoints

### Autenticación — públicos

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/auth/register` | Crea un usuario. Devuelve 409 si el email ya existe |
| `POST` | `/auth/login` | Devuelve un JWT válido durante 1 hora |

### Pacientes y citas — requieren token

Todas exigen la cabecera `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/patients` | Lista todos los pacientes |
| `GET` | `/patients/:id` | Devuelve un paciente |
| `POST` | `/patients` | Crea un paciente |
| `PATCH` | `/patients/:id` | Actualiza campos concretos |
| `DELETE` | `/patients/:id` | Elimina un paciente |
| `GET` | `/appointments` | Lista todas las citas |
| `GET` | `/appointments/:id` | Devuelve una cita |
| `POST` | `/appointments` | Crea una cita |
| `PATCH` | `/appointments/:id` | Actualiza campos concretos |
| `DELETE` | `/appointments/:id` | Elimina una cita |

### Códigos de estado

| Código | Cuándo |
| --- | --- |
| `200` | Petición correcta |
| `201` | Recurso creado |
| `204` | Correcta, sin contenido que devolver (DELETE) |
| `400` | Datos de entrada inválidos |
| `401` | Token ausente, inválido o caducado |
| `404` | El recurso no existe |
| `409` | Conflicto (email ya registrado) |
| `429` | Demasiadas peticiones |
| `500` | Error interno |

---

## Seguridad

- **Contraseñas hasheadas con bcrypt.** Nunca se guardan en texto plano ni se
  pueden recuperar: en el login se vuelve a hashear y se comparan los hashes.
- **JWT con expiración de 1 hora.** Un JWT no se puede revocar, así que caduca.
- **Consultas parametrizadas** (`$1`, `$2`) en todo el acceso a datos, para que
  los valores nunca se interpreten como SQL.
- **Rate limiting**: 5 intentos fallidos cada 15 minutos en login y registro,
  100 peticiones cada 15 minutos en el resto.
- **CORS restringido** a los orígenes de `CORS_ORIGIN`.
- **Secretos fuera del código**: el `.env` está en `.gitignore`; se versiona
  únicamente `.env.example` con los nombres y sin los valores.
- **Validación de la configuración al arrancar**: si falta una variable de
  entorno, la aplicación falla de inmediato en lugar de más tarde en ejecución.

---

## Estado del proyecto

Proyecto en formación. Implementado hasta el módulo 10 de 13.

**Pendiente:**

- Documentación de la API con Swagger / OpenAPI
- Tests con Vitest y Supertest
- ESLint
- Despliegue

**Limitaciones conocidas:**

- **Hay autenticación pero no autorización.** El middleware ya inyecta el
  usuario autenticado en `req.user`, pero ningún servicio comprueba la
  propiedad del recurso: falta relacionar cada paciente con su dueño.
- **La validación de entrada solo cubre `POST /patients`.** Faltan el resto de
  endpoints; la intención es sustituir las comprobaciones manuales por esquemas
  de validación.
- **El manejador de errores global está montado pero no llega a usarse**, porque
  cada controlador captura sus propios errores. Pendiente de introducir clases
  de error propias que el manejador traduzca a códigos de estado.

---

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Arranca el servidor y recarga al guardar |
| `npm run migrate up` | Aplica las migraciones pendientes |
| `npm run migrate down` | Revierte la última migración |
