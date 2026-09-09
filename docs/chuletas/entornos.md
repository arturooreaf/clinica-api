# Por qué hemos tocado `.env`, `.env.test` y los happy paths

> Chuleta de repaso — lo de hoy (09/09/2026), explicado de un tirón.
> Si en dos semanas no te acuerdas de por qué existe algo de esto, empieza por aquí.

---

## El resumen en una frase

**Un test que usa la base de datos real es peligroso. Necesitas una base falsa, desechable, solo para tests. Y necesitas decirle a tu app "hoy usa la falsa" sin tocar el código.** Todo lo de hoy es eso, en distintas capas.

---

## 1. Test = lista de comprobación, no examen

Un **test automático** es código que llama a tu propia API y comprueba la respuesta, en vez de que tú abras Postman cada vez.

No es para "aprobar un examen una vez". Es para dentro de dos meses, cuando cambies algo y no te acuerdes de qué probar a mano. `npm test` te lo dice en 3 segundos.

```
Analogía: la checklist de un piloto antes de despegar.
No confía en la memoria. La repite siempre, igual, sin saltarse nada.
```

---

## 2. Dos tipos de test — y por qué te faltaba uno

| Tipo                          | Qué prueba              | Ejemplo tuyo                               |
| ----------------------------- | ----------------------- | ------------------------------------------ |
| **Happy path** (camino feliz) | Todo sale bien          | `POST /patients` con datos correctos → 201 |
| **Edge case** (caso límite)   | Algo falla, a propósito | `POST /patients` sin token → 401           |

**Tenías 7 de 8 tests que eran edge cases.** No porque lo decidieras tú — porque son los fáciles: un middleware corta la petición _antes_ de llegar a la base de datos, así que no necesitan Postgres encendido para pasar.

Un happy path de verdad (`crear un paciente y comprobar que existe`) **sí** toca la base de datos: escribe una fila y la lee. Y ahí empieza el problema.

---

## 3. Por qué NO puedes usar tu base de siempre para testear

Dos motivos, no uno:

**Motivo 1 — se ensucia.**
Si tu test de "borrar paciente" borra un paciente de verdad, cada `npm test` te destroza los datos que tenías guardados a mano para depurar.

**Motivo 2 — se vuelve un rumor, no una prueba.**
Un test como _"listar pacientes devuelve la lista"_ pasaría o fallaría según **cuántos pacientes hubiera ese día concreto**. Un test tiene que dar el mismo resultado siempre, si no, no sirve para nada — es ruido, no información.

**La solución:** una base de datos aparte, que se vacía y se rellena de cero en cada test (`TRUNCATE ... CASCADE`, lo que viste en el error). Así el resultado depende solo de tu código, nunca de lo que hubiera guardado antes.

```mermaid
graph LR
    A[npm test] --> B[TRUNCATE la base]
    B --> C[crea datos limpios]
    C --> D[corre el test]
    D --> E[resultado 100% predecible]
```

Esa base aparte es **`clinica_test`** — mismo Postgres, otra base lógica.

---

## 4. Código vs. configuración (por qué existe `.env`)

Regla general, no solo de este proyecto:

- **Código** = qué hace tu app. Igual en todas partes.
- **Configuración** = a qué se conecta, con qué claves. Distinto según dónde corra.

`DATABASE_URL` es configuración: la dirección a la que te conectas. No puede estar escrita fija dentro de `pool.ts` (`"conéctate a esta base concreta"`), porque entonces no podrías cambiar de base sin tocar y recompilar código.

Por eso vive en un archivo `.env`, fuera del código.

Vas a ver esta misma idea otra vez con Render: producción tiene sus propias variables, distintas de tu portátil, **con el mismo código**.

---

## 5. La cadena completa de hoy

Este es el mapa que conecta todo lo que has tocado:

```mermaid
graph TD
    A["npm test"] --> B["Jest pone NODE_ENV=test<br/>(él solo, sin que hagas nada)"]
    B --> C["env.ts lee NODE_ENV"]
    C -->|"=== 'test'"| D[".env.test"]
    C -->|"si no"| E[".env"]
    D --> F["DATABASE_URL → clinica_test<br/>(base desechable)"]
    E --> G["DATABASE_URL → BBDDcareexpand<br/>(tu base de desarrollo)"]
```

**Una sola variable (`NODE_ENV`) decide toda la cadena de abajo.** Por eso un solo `console.log` te sirvió para confirmar todo el flujo.

---

## 6. Los dos bugs que arreglaste hoy, en una línea cada uno

1. **`dotenv.config()` sin argumento siempre carga `.env`.** Había que decirle explícitamente qué archivo cargar con `{ path: archivo }`.
2. **El host de la `DATABASE_URL` en `.env.test` era `clinica_test`** (el nombre de la base, no el host). Tenía que ser `localhost`, igual que en `.env` — solo cambia el **nombre de la base al final** de la URL, no el host.

---

## Para comprobar que lo tienes

Sin mirar arriba, contesta:

1. ¿Por qué un test que borra datos de verdad es un problema, aunque la base sea "solo de pruebas tuyas"?
2. ¿Qué variable decide si tu app carga `.env` o `.env.test`, y quién la pone en valor `"test"`?
3. En una URL de conexión (`postgresql://usuario:pass@host:puerto/basedatos`), ¿qué parte te equivocaste al copiar `.env` a `.env.test`?
