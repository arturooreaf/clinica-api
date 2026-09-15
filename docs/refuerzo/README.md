# Puntos a reforzar

Cosas prioritarias detectadas trabajando en el proyecto, escritas para que las
tengas a mano y no dependan de acordarte. No es una lista de deberes: es el
diagnóstico de dónde está el desfase entre lo que construyes y lo que entiendes.

Origen: sesión del 10/09/2026 (base de test, happy paths y primeros edge cases).

---

## 1. La prioridad número uno: JavaScript base

El proyecto va por delante de los fundamentos. Eso es normal aprendiendo en el
trabajo, pero tiene un riesgo concreto: el repo abre puertas y los fundamentosgit add docs/ && git commit -m "docs: add reinforcement notes"
deciden si entras.

Lo que hay que asentar, por orden:

**Promesas y `async` / `await`.** Media sesión costó fijar esto. Lo esencial:

- Toda función marcada `async` devuelve una Promesa. Siempre, aunque escribas
  `return 5`.
- La Promesa es el resguardo, no el abrigo. `await` es ir al mostrador a
  recogerlo.
- **Sin `await` la acción se ejecuta igual.** Lo que pierdes no es la acción: es
  esperar el resultado, enterarte de lo que devolvió, y enterarte si falló.
- Una Promesa sin recoger (_floating promise_) es un objeto, y cualquier objeto
  es _truthy_. Un `if` sobre ella entra siempre. Fallo silencioso.

**El bucle de eventos.** Por qué "esperar" en una función no congela el
servidor. Sin esto, `async` en Node siempre será magia.

**Y después:** closures, `this`, `undefined` vs `null`, `===` vs `==`.

Lectura: MDN, guía de "Usar promesas". Un rato corto y constante, aparte del
proyecto.

---

## 2. Tres patrones de error que se repitieron

No son despistes sueltos; son hábitos, y por eso se pueden corregir.

### 2.1. Copiar un assert sin traducir la intención

Pasó tres veces en la misma sesión:

- En el 403 del `GET` se afirmó `toHaveProperty("id")` — o sea, que la respuesta
  traía los datos del paciente ajeno. Eso es un agujero de seguridad, y el test
  lo estaba celebrando.
- En el 403 del `PATCH` se afirmó que el body traía `"recuperado"` — o sea, que
  el intruso había conseguido modificarlo.
- En el mismo test se afirmó `rowCount === 0`, copiado del `DELETE`, cuando un
  `PATCH` no borra nada y esa fila siempre está.

**En un test de denegación, casi todos los asserts van al revés que en el happy
path del que los copias.**

Regla práctica: antes de dar por bueno un `expect`, léelo traducido al español
en voz alta. "Afirmo que el cambio se aplicó" — ¿es eso lo que quieres probar?
Diez segundos.

### 2.2. Cadenas de texto mal escritas

`/Authorization` con barra, `Autorization` sin hache. Dos veces el mismo día.

El problema es que **TypeScript no protege las cadenas de texto**. Un nombre de
cabecera es un `string` que construyes tú; el compilador no sabe si está bien
escrito. Y el síntoma engaña: la cabecera no se encuentra, no hay token, y
recibes un **401** cuando esperabas otra cosa.

Regla: si un test de autorización devuelve 401 sin motivo, lo primero que se
mira es cómo está escrita esa palabra.

### 2.3. Razonar bien y luego hacer lo contrario

En el test del 404 la pregunta era si hacía falta preparar datos. La respuesta
fue correcta: "no, porque el `beforeEach` ya borra todo". Y acto seguido se
insertaron un usuario y un paciente.

Fíate de tu propio razonamiento. Si has llegado a una conclusión y la escribes,
sostenla.

---

## 3. Conceptos que conviene repasar

**Los tipos desaparecen al compilar.** En `dist/` no queda ni rastro de un
`type`. Por eso un tipo **no valida** lo que llega en `req.body` — para eso está
el middleware de validación. Y por eso el test que comprueba que la API no
devuelve `password_hash` es lo único que protege esa promesa en runtime, no el
tipo `UserView`.

**Tabla no es lo mismo que base de datos.** `owner_id` apunta a la tabla `users`,
que vive en la **misma** base. Eso es una clave foránea.

**Constraints.** Reglas que hace cumplir la propia base, venga quien venga:
`PRIMARY KEY`, `UNIQUE`, `FOREIGN KEY`. Se leen por el nombre —
`patients_owner_id_fkey` es tabla, columna y tipo. Validar en el código protege
solo el camino que pasa por tu API; la constraint protege el dato siempre.

**El resultado de `pool.query`.** `rowCount` es un número: cuántas filas.
`rows` es un array con el contenido, y cada posición es un objeto cuyas claves
son los nombres de las columnas. Contar filas no es lo mismo que mirar dentro.

**Leer el error entero.** `WHERRE` con dos erres, un `fkey` que decía
exactamente qué columna apuntaba a un usuario inexistente. El mensaje casi
siempre señala el sitio con el dedo.

---

## 4. Dos familias de rojo

Saber distinguirlas ahorra horas.

**Falla un assert:**

```
Expected: 404
Received: 401
```

El código llegó al final y devolvió otra cosa. **Hay un bug tuyo.**

**Algo revienta:**

```
error: deadlock detected
error: duplicate key value violates unique constraint
```

Es una excepción: el test ni llegó a comprobar nada. Puede ser tu código — o el
entorno.

Tres señales de que es el entorno y no tú:

1. Fallan tests que no has tocado.
2. Pasaban hace veinte minutos con el mismo código.
3. El error habla el idioma de la base de datos o de la red, no el de tu
   dominio.

**Regla: cuando falla algo que no has tocado, no busques en lo que sí has
tocado. Busca qué ha cambiado alrededor.**

---

## 5. Cosas de proyecto real que ya has tocado

No son teoría: te pasaron.

**Estado compartido y concurrencia.** Toda la suite comparte una sola base y
asume que nadie más la toca. La extensión de Jest de VS Code corría en segundo
plano con `--watch` y truncaba e insertaba a la vez: deadlocks y claves
duplicadas. La solución de fondo es aislar cada test — transacciones con
`ROLLBACK`, o una base por proceso.

**Tests _flaky_.** Un test que falla una de cada diez veces es peor que uno que
falla siempre: el equipo aprende a relanzarlo, y el día que detecte un bug real
nadie le hará caso. Con un flaky, **una pasada en verde no demuestra nada**:
verificar es lanzar diez veces.

**`push` no fusiona.** `push` sube lo que tu rama local ya tiene; el que trae
commits de otra rama es `merge`. Saltarse el merge y hacer push da un mensaje de
éxito perfectamente válido que no lleva nada del trabajo nuevo. Ya pasó.

**`.git/index.lock`.** Es el cartel de "ocupado" que Git pone antes de escribir
en el índice. Si el proceso muere sin quitarlo, bloquea todo. Se borra, pero
solo tras comprobar que no hay ningún Git vivo de verdad.

**La rama decide qué ves.** Estar en `main` mirando un archivo y creer que se ha
perdido trabajo que está commiteado en otra rama. Mirar en qué rama estás antes
de sacar conclusiones.

---

## 6. Orden sugerido

1. **JavaScript base**, fuera del proyecto y a diario. Es la inversión con más
   retorno.
2. **SQL de verdad**: joins, índices, `EXPLAIN`, transacciones. La base de datos
   es la herramienta principal de un backend.
3. **Leer errores despacio** antes de tocar nada.
4. Y seguir construyendo, que es lo que funciona.

---

## 7. Deuda técnica pendiente en el proyecto

Apuntada para no perderla:

- Fixtures duplicados: el mismo bloque de `INSERT` repetido en muchos tests.
  Toca extraerlo a _factories_ cuando estén cerrados los edge cases.
- Aislamiento de tests: sustituir `TRUNCATE` por transacciones con `ROLLBACK`.
- Cobertura: medir qué líneas no toca ningún test.
- CI con GitHub Actions: lanzar la gate en cada push.
- Paginación en `GET /patients` e índice en `owner_id`. Se aprecian de verdad
  con datos de volumen (script de _seeding_ con faker).
- `patient.service.ts`: la variable `owner_Id` con I mayúscula.
- El `RETURNING` del `update` en el repositorio no devuelve `owner_id`, a
  diferencia del `create`.
