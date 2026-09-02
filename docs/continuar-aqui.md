# Dónde me quedé

> Nota para retomar la formación en una sesión nueva. Pegar esto al empezar.

## Estado

- Módulos 1 a 11 de la ruta: **terminados**.
- Rama actual: `feature/authorization`.
- Pendiente: **módulo 12 (entrega/despliegue)** y **módulo 13 (proyecto final)**.

## Tarea en curso: autorización (`owner_id` + 403)

Plan de cuatro pasos:

1. **Migración** — hecha y aplicada. La tabla `patients` tiene
   `owner_id integer REFERENCES users(id) ON DELETE SET NULL`.
2. **Guardar el `owner_id` al crear** — casi terminado. Toca tres archivos:
   - `patient.repository.ts` → hecho (`create(data, ownerId)`, columna y `RETURNING`).
   - `patient.service.ts` → hecho el parámetro; **falta meter `ownerId` en el `logger.info`**.
   - `patient.controller.ts` → leer `req.user?.userId`, comprobarlo, pasarlo como
     segundo argumento. **Falta borrar el `if (!ownerId)` duplicado del final.**
3. **Filtrar al leer** — `SELECT ... WHERE owner_id = $1`, para que cada usuario
   vea solo sus pacientes. **No empezado.**
4. **Devolver 403** cuando el paciente existe pero no es del usuario.
   **No empezado.**

Sin commit todavía.

## Después: módulo 12, despliegue en Render

Tres cosas que van a fallar y hay que arreglar antes:

- `const port = 3000` en `server.ts` → tiene que ser `process.env.PORT ?? 3000`.
- Faltan los scripts `"build": "tsc"` y `"start": "node dist/server.js"`.
- La carpeta `docs/` tiene que llegar al servidor: `app.ts` hace `readFileSync`
  del `openapi.yaml` al arrancar, y si no está, el servidor no levanta.
- Las variables de entorno se meten a mano en el panel de Render.

## Deudas conocidas y aceptadas

- Validación solo en `POST /patients` y `POST /emails`. `/auth/login` devuelve
  500 en vez de 400 con el body vacío (anotado como `it.todo`).
- `errorHandle` está montado pero nunca se alcanza.
- No hay base de datos de test ni mock de Resend, así que no se pueden probar
  los 200/201/204.
- Borrar `src/suma.test.ts` (archivo de práctica).

## Cómo quiero que me enseñes

Está todo en las instrucciones del proyecto. Lo esencial:
un concepto a la vez, en español, con analogía + ejemplo comentado + ejercicio
que resuelvo yo. **No me des el código hecho**: corrígeme y dame pistas.
