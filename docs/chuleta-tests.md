# Chuleta · Tests

Resumen de lo aprendido montando los tests del proyecto.

---

## Por qué existen los tests si ya tengo `tsc`

Son capas distintas, no alternativas.

|                | Qué comprueba                    | Punto ciego                                          |
| -------------- | -------------------------------- | ---------------------------------------------------- |
| `tsc --noEmit` | que las piezas encajen (tipos)   | todo lo que va dentro de un string: SQL, rutas, URLs |
| tests          | que el resultado sea el correcto | los archivos que no ejecuta                          |

**El caso real:** escribí `INSERT INTO patients (..., ownerId)` con el nombre de
la variable en vez del de la columna. `tsc` dijo que todo estaba perfecto,
porque para él eso es _un string_, y un string siempre es válido. Ese fallo solo
lo caza un test o un usuario.

Y al revés: los tests no detectan que llamé a una función con un argumento de
menos si ese archivo no se ejecuta en ninguna prueba.

---

## Las herramientas: quién hace qué

- **Jest** — el que organiza y ejecuta. Cuenta, nombra y reporta. No sabe nada
  de HTTP.
- **supertest** — el que sabe hablar HTTP. Lanza peticiones contra la app sin
  abrir un puerto real.
- **ts-jest** — el traductor. Jest no entiende TypeScript; ts-jest lo compila al
  vuelo.

Por eso hicieron falta los tres, aunque en la documentación de Jest solo salga Jest.

---

## Las dos fases de Jest

Esto explica casi todos los errores raros.

1. **Registro** — el archivo se ejecuta una vez entero, solo para _apuntar_ qué
   tests existen. Aquí no se prueba nada.
2. **Ejecución** — se lanza cada `it` uno a uno, ahora sí con sus `await`.

**Consecuencia:** `describe` **nunca** lleva `async`. En la fase de registro no
hay nada que esperar. El `async` va en el `it`, que es donde está el `await`.

> **Regla:** el `async` va donde está el `await`.

---

## La sintaxis mínima

```ts
describe("GET /patients", () => {
  // agrupa
  it("responde 401 sin token", async () => {
    // un caso
    const response = await request(app).get("/patients");
    expect(response.status).toBe(401); // el veredicto
  });
});
```

- `describe` y `it` son lo que permite a Jest **contar y nombrar**.
- `expect` es lo que decide si pasa o falla.
- Los textos son etiquetas que **Jest nunca lee**. Un test mal nombrado es un
  test que miente: pasa en verde diciendo algo falso.

Los dos argumentos van **dentro del mismo paréntesis**, igual que en
`app.get("/", handler)`.

---

## `toBe` vs `toEqual`

- `toBe` → _¿es el mismo?_ Para números y strings.
- `toEqual` → _¿tiene el mismo contenido?_ Para objetos y arrays.

Dos objetos idénticos **no son el mismo objeto**. `toBe` los daría por
distintos.

---

## supertest

Exporta **una sola función**. Por eso el import va sin llaves:

```ts
import request from "supertest"; // correcto
import { request } from "supertest"; // mal
```

| Método                       | Para qué            |
| ---------------------------- | ------------------- |
| `.get(url)` / `.post(url)`   | el método y la ruta |
| `.set("Authorization", ...)` | una **cabecera**    |
| `.send({ ... })`             | el **body**         |

Los params van escritos en la URL: `/patients/999`, no `/patients/:id`.
Los dos puntos son un marcador **al definir** una ruta, texto literal **al
llamarla**.

> `res.setHeader` (tu código, sobre la respuesta) y `.set` (el test, sobre la
> petición) son el mismo verbo en direcciones opuestas.

---

## El token firmado a mano

```ts
const tokenValido = jwt.sign({ userId: 1 }, JWT_SECRET, { expiresIn: "1h" });
```

Funciona sin base de datos porque **JWT no guarda estado**. El servidor no
consulta nada: recalcula la firma con el secreto y compara. Si cuadra, adentro.

Por eso mismo un token **no se puede revocar**: la caducidad es el único freno.

---

## Qué testear: una prueba por camino, no por endpoint

Esta fue la decisión profesional del módulo.

- El 401 sale de **un solo middleware**. Tres tests (uno por router) bastan para
  cubrirlo entero. Hacer uno por cada ruta es repetir la misma línea de código
  catorce veces.
- Los 400 son **código distinto cada vez** (validaciones diferentes), así que
  cada uno merece su test.

**Lo que no se puede probar sin más infraestructura:**

| Código                | Por qué no                                             |
| --------------------- | ------------------------------------------------------ |
| 200 / 201 / 204 / 404 | necesitan base de datos de test                        |
| 202 (email)           | necesita un mock de Resend                             |
| 429                   | bloquearía el login 15 minutos y contaminaría el resto |
| 500                   | no es provocable a voluntad                            |

Un test **nunca** debe llamar a un servicio externo real: cuesta dinero, es
lento, falla por motivos ajenos a tu código y mandaría un correo de verdad en
cada `npm test`.

Para los huecos conocidos: `it.todo("...")`. Declara el test sin escribirlo. Es
la forma honesta de documentar una deuda en vez de olvidarla.

---

## Errores que cometí (para no repetirlos)

- **`async` en el `describe`** → no, ahí no hay nada que esperar.
- **`await` sin `async` en el `it`** → el contrario del anterior.
- **`.get` sin paréntesis** → el error dice
  `Property 'status' does not exist on type '(url: string) => Test'`. Una flecha
  `=>` en un tipo de error significa: _tienes la función donde querías el
  resultado_.
- **`/appintments`** → una errata en la URL da 404 en vez de 401, y Jest lo
  reporta en la línea del `expect`. **Los errores se reportan donde se detectan,
  no donde se causan.**
- **`/patients/:id` literal** → pasó por accidente: `":id"` no es un número, así
  que dio 400 por el motivo equivocado. Un test verde por la razón equivocada es
  peor que uno rojo.
- **Auto-import del editor**: `import { request } from "node:http"`. Existe,
  compila, y no es lo que quieres. Las llaves eran la pista.

---

## Configuración

`jest.config.js`:

```js
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: { module: "commonjs" } }],
  },
};
```

Dos cosas que costaron un rato:

- El `tsconfig: { module: "commonjs" }` está ahí porque mi `tsconfig` usa
  `nodenext`, así que ts-jest generaba ESM y Jest ejecuta CommonJS.
- `"types": ["node", "jest"]` en el `tsconfig` es **una lista blanca**: si la
  pones, TypeScript carga _solo_ lo que aparezca en ella. Por eso `@types/jest`
  estaba instalado y aun así salía `Cannot find name 'describe'`.

Y el motivo de separar `app.ts` de `server.ts`: importar `app.ts` **no abre un
puerto**. Sin esa separación, cada test levantaría un servidor real.
