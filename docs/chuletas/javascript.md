# Chuleta · JavaScript

Lo que me falló de base mientras montaba la validación del PATCH.
No es backend: es el lenguaje. Todo lo demás se apoya aquí.

> Regla que vale para toda esta chuleta: **compruébalo, no lo recuerdes.**
> `node -e 'console.log(...)'` tarda tres segundos.

---

## `undefined` vs `null`

|             | Qué significa       | Quién lo pone              |
| ----------- | ------------------- | -------------------------- |
| `undefined` | ahí no había nada   | JavaScript, solo           |
| `null`      | "nada", a propósito | una persona, escribiéndolo |

Es la diferencia entre una casilla del formulario **que nadie rellenó** y una
casilla donde alguien escribió **"ninguno"**.

Al desestructurar una propiedad que no existe siempre sale `undefined`:

```bash
node -e "const {name} = {age: 40}; console.log(name)"   # undefined
```

**Nunca sale `null`.** Si ves un `null`, alguien lo mandó queriendo.

---

## `===` vs `==`

- `===` compara tal cual: mismo valor **y** mismo tipo.
- `==` **convierte antes** de comparar, con reglas que sorprenden.

```bash
node -e 'console.log(null == undefined, null === undefined)'   # true false
```

Para `==`, `null` y `undefined` son la misma cosa. Para `===`, no.

**Regla: usa siempre `===` y `!==`.** El `==` no hace falta casi nunca, y
mezclar los dos en la misma función es pedir un bug.

---

## `typeof` devuelve un **texto**

No devuelve un tipo ni un booleano. Devuelve un string.

```bash
node -e 'console.log(typeof "Ana", typeof 40, typeof undefined)'
# string number undefined
```

Por eso `typeof name !== "string"` compara **dos textos**, con comillas en los
dos lados. Y por eso, si `name` no viene:

```
typeof name !== "string"
typeof undefined !== "string"
"undefined" !== "string"        ← dos textos distintos
→ true
```

### Para qué sirve si ya tengo TypeScript

Porque **TypeScript desaparece al compilar**. Revisa el código que escribo yo,
antes de arrancar. `req.body` llega de fuera, por la red, y puede traer
cualquier cosa: TypeScript no lo ha visto nunca.

TypeScript es el control de calidad de la fábrica. `typeof` es el guardia de la
puerta. La fábrica no revisa lo que traen los visitantes.

---

## `&&` vs `||`, y en qué nivel va cada uno

- `&&` → tienen que cumplirse **todas**.
- `||` → basta con **una**.

En la validación del PATCH aparecen los dos, en niveles distintos:

```ts
(name !== undefined && typeof name !== "string") || // ← && dentro
  (age !== undefined && typeof age !== "number") || // ← || entre
  (diagnosis !== undefined && typeof diagnosis !== "string");
```

**Dentro** de cada paréntesis, `&&`: _"si el campo viene Y viene mal"_.
**Entre** los paréntesis, `||`: _"basta con que uno falle para rechazar"_.

Si pongo `&&` entre los tres, estoy diciendo "rechaza solo si los tres están mal
a la vez", que no es lo que quiero.

### El interruptor `!== undefined`

```ts
name !== undefined && typeof name !== "string";
```

Si `name` no viene, la primera mitad ya es falsa y el paréntesis entero da
`false` — **ni siquiera llega a mirar el `typeof`**. Eso es lo que hace que un
campo sea opcional.

Y al revés: **la obligatoriedad del POST no está escrita en ningún sitio.** Sale
sola de _no_ poner ese interruptor, porque `typeof undefined` nunca es
`"string"`.

> POST: _"¿está todo?"_ · PATCH: _"lo que has traído, ¿está bien?"_

---

## Los parámetros van por **posición**, no por nombre

Express siempre llama así:

```
tuFuncion(la_petición, la_respuesta, next)
```

El nombre que yo les ponga es una etiqueta que me invento. No cambia lo que
llega. Si escribo `(res: Response, req: Request, next)`, la variable llamada
`res` contiene la petición, y `req` contiene la respuesta.

Es una hoja con tres casillas en orden fijo: si a la primera le pongo la
etiqueta "apellido", la gente va a seguir escribiendo el nombre ahí.

**Siempre `(req, res, next)`.** Única excepción: el middleware de errores, que
lleva cuatro y el error va primero — `(err, req, res, next)`. Express distingue
uno de otro **contando los parámetros**, así que ahí no se puede quitar el
`next` aunque no se use.

---

## `export default` vs `export` con nombre

|                       | Cuántos         | Al importar                           |
| --------------------- | --------------- | ------------------------------------- |
| `export default algo` | uno por archivo | sin llaves, y el nombre me lo invento |
| `export { a, b }`     | los que quiera  | **con llaves** y con su nombre exacto |

`default` significa "la cosa principal de este archivo", y no puede haber dos
cosas principales. En cuanto el archivo exporta dos funciones, ninguna puede
serlo: van con nombre.

`export` no admite un nombre suelto (`export miFuncion;` no es válido). Solo:
`export default`, `export` + declaración, o `export { ... }`.

---

## Errores que cometí (para no repetirlos)

- **`export miFuncion;`** → `TS1128: Declaration or statement expected`. El
  `export` necesita una de sus tres formas; un nombre a pelo no es ninguna.
- **`export function (miFuncion);`** → `TS1003: Identifier expected`.
  `export function` **declara** una función nueva con su cuerpo; no sirve para
  señalar una que ya existe arriba.
- **Cambiar el `export` y olvidar el `import`.** El error se mudó de archivo:
  dejó de salir en el middleware y empezó a salir en `routes.ts`. Eso significa
  que ese lado ya estaba bien.
- **Parámetros del revés** → `Type 'Request' is missing the following
properties from type 'Response': status, send...`. No faltaban: las estaba
  buscando en el objeto equivocado.
- **Copiar la validación del POST al PATCH.** Hacía obligatorios los tres
  campos. Un `PATCH {"age": 40}` respondía 400.
- **Cambiar `||` por `&&` entre las condiciones.** Con `{"age": "treinta"}` daba
  `true && true && false` → `false` → pasaba al SQL → 500. El bug original,
  intacto.
- **Un espacio invisible en el mensaje.** `"Datos inválidos "` y
  `"Datos inválidos"` son dos textos distintos, y un `toEqual` lo caza.

---

## Cómo leer un error de TypeScript

Es un **embudo**: arriba lo general, abajo lo concreto.
**La causa está en la última línea, la más indentada.** Las de arriba son ruido.

Y el formato `archivo.ts(30,18)` es **línea 30, columna 18**.

> El número de línea no dice en qué **función** estás. Un archivo con cinco
> funciones son cinco cajas independientes: localiza la función antes de razonar
> sobre el cambio. (Perdí media hora con un `400` que estaba en `updatePatient`
> creyendo que afectaba a un test que entraba por `getPatientById`.)
