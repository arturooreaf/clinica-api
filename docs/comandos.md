# Comandos del proyecto

Referencia de todos los comandos necesarios para trabajar en el proyecto.

Para listar los scripts disponibles en cualquier momento:

```bash
npm run
```

---

## Arranque diario

En este orden.

```bash
docker compose up -d
```

Levanta PostgreSQL en segundo plano (`-d`). El contenedor se llama
`patients-careexpand-db`. Comprobar que está arriba:

```bash
docker ps
```

```bash
npm run dev
```

Arranca la API en `http://localhost:3000` con recarga automática al guardar.

> `tsx` **no comprueba los tipos**: los elimina y ejecuta. La comprobación de
> tipos es `npm run typecheck`, que es un comando aparte.

Al terminar la jornada:

```bash
docker compose down
```

---

## Comprobaciones de calidad

Los cuatro que deben pasar antes de integrar cualquier rama.

| Comando                | Qué comprueba               | Salida si todo está bien                     |
| ---------------------- | --------------------------- | -------------------------------------------- |
| `npm run typecheck`    | los tipos de TypeScript     | sin salida                                   |
| `npm run lint`         | descuidos y malas prácticas | sin salida                                   |
| `npm run format:check` | el formato                  | `All matched files use Prettier code style!` |
| `npm test`             | el comportamiento           | pendiente de implementar                     |

### `npm run typecheck`

```bash
npm run typecheck
```

Equivale a `tsc --noEmit`: revisa los tipos de los 40 archivos sin generar
JavaScript. Es la única comprobación de tipos del proyecto, porque `npm run dev`
no la hace.

El editor solo avisa de los archivos abiertos. Este comando revisa todos.

### `npm run lint`

```bash
npm run lint
```

ESLint sobre `src`. Detecta `console.log` olvidados, variables sin usar y
patrones problemáticos. **Un aviso de ESLint no impide que el programa
funcione**: señala lo que no se debe hacer, no lo que está roto.

### `npm run format` y `npm run format:check`

```bash
npm run format         # reformatea los archivos
npm run format:check   # solo informa, no toca nada
```

El primero se usa en local. El segundo es el que va en integración continua,
porque falla en lugar de modificar archivos.

La configuración está en `.prettierrc` y las exclusiones en `.prettierignore`.
`docs/postman/` está excluido porque lo genera Postman al exportar.

---

## Base de datos

### Aplicar migraciones

```bash
npm run migrate up
```

Aplica las migraciones pendientes de `src/database/migrations`.

### Deshacer la última

```bash
npm run migrate down
```

### Crear una migración nueva

```bash
npm run migrate create nombre-de-la-migracion
```

Genera un archivo con marca de tiempo en `src/database/migrations`. El orden de
ejecución lo determina esa marca de tiempo, no el nombre.

### Conectarse a la base de datos

```bash
docker exec -it patients-careexpand-db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
```

El usuario y la base de datos salen del `.env` a través del `docker-compose.yml`, así
que se leen de las variables del propio contenedor en lugar de escribirlos a mano.

Dentro de `psql`:

| Comando       | Qué hace                      |
| ------------- | ----------------------------- |
| `\dt`         | listar tablas                 |
| `\d patients` | describir la tabla `patients` |
| `\q`          | salir                         |

---

## Documentación de la API

Con la API arrancada:

- **Swagger UI** — http://localhost:3000/docs

La especificación está en `docs/openapi.yaml`. Al modificarla basta con recargar
el navegador: se lee al arrancar el servidor, así que si `npm run dev` está
activo la recarga es automática.

**Colección de Postman** — `docs/postman/careexpand-api.postman_collection.json`.
Se importa desde Postman con _Import > Raw text_.

---

## Pruebas manuales rápidas

Secuencia completa en `docs/pruebas.md`. Lo mínimo:

```bash
curl http://localhost:3000/
```

Guardar un token en una variable de la terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@careexpand.com","password":"Demo1234"}' \
  | sed 's/.*"token":"\([^"]*\)".*/\1/')
```

```bash
echo $TOKEN
```

Usarlo:

```bash
curl http://localhost:3000/patients -H "Authorization: Bearer $TOKEN"
```

El token caduca a la hora. Al recibir 401 en todo, repetir el paso anterior.

---

## Git

### Empezar una tarea

```bash
git checkout dev
git pull origin dev
git checkout -b feature/nombre-de-la-tarea
```

### Antes de cada commit

```bash
npm run typecheck && npm run lint && npm run format:check
```

Un commit debe dejar el repositorio funcionando. Si no compila, bloquea al resto
del equipo.

### Commit

```bash
git add <archivos>
git commit -m "tipo: descripcion en imperativo"
```

Prefijos en uso:

| Prefijo    | Para qué                                        |
| ---------- | ----------------------------------------------- |
| `feat`     | funcionalidad nueva                             |
| `fix`      | corrección de un fallo                          |
| `chore`    | herramientas, configuración, dependencias       |
| `docs`     | documentación que no afecta a lo que se ejecuta |
| `style`    | formato, sin cambios de lógica                  |
| `refactor` | reorganización sin cambio de comportamiento     |
| `test`     | pruebas                                         |

Un reformateo masivo va **siempre en su propio commit**: mezclado con lógica,
el diff se vuelve irrevisable.

### Integrar

```bash
git checkout dev
git merge feature/nombre-de-la-tarea
git push origin dev
```

```bash
git checkout main
git merge dev
git push origin main
```

```bash
git branch -d feature/nombre-de-la-tarea
```

### Consultar el estado

```bash
git status --short          # qué he tocado
git log --oneline -10       # los ultimos commits
git diff --stat             # cuanto ha cambiado cada archivo
git branch --show-current   # en que rama estoy
```

---

## Dependencias

```bash
npm install                    # instalar todo lo del package.json
npm install <paquete>          # dependencia de produccion
npm install -D <paquete>       # dependencia de desarrollo
```

La pregunta que decide dónde va: **¿esto se ejecuta en el servidor?** Si la
respuesta es sí, va en `dependencies`.

`pino-pretty` es de desarrollo. `yaml` es de producción, porque la API lee el
`openapi.yaml` al arrancar.

```bash
npm outdated                   # que paquetes tienen version nueva
npm audit                      # vulnerabilidades conocidas
```

Antes de actualizar una versión mayor, comprobar las _peer dependencies_: la
versión buena no es la más nueva, es la más nueva que soporta toda la cadena de
herramientas.

---

## Si algo falla

| Síntoma                             | Causa                              | Solución                                            |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------- |
| 500 en todo lo que toca datos       | el contenedor no está levantado    | `docker compose up -d`                              |
| 401 de repente en todo              | el token ha caducado               | volver a hacer login                                |
| 429 en el login                     | límite de 5 intentos fallidos      | esperar 15 min o reiniciar el servidor              |
| Un cambio en `.env` no surte efecto | las variables se leen al arrancar  | reiniciar `npm run dev` a mano                      |
| ESLint no marca nada en el editor   | el servidor de ESLint está colgado | paleta de comandos: `ESLint: Restart ESLint Server` |
| `command not found: eslint`         | falta el prefijo del script        | usar `npm run lint`, no `eslint`                    |
