# Cheat sheet · JavaScript

The basics that tripped me up while building the PATCH validation.
This isn't backend stuff: it's the language itself. Everything else sits on top of it.

> A rule for this whole cheat sheet: **check it, don't remember it.**
> `node -e 'console.log(...)'` takes three seconds.

---

## `undefined` vs `null`

|             | What it means         | Who sets it             |
| ----------- | --------------------- | ----------------------- |
| `undefined` | there was nothing     | JavaScript, on its own  |
| `null`      | "nothing", on purpose | a person, by writing it |

It's the difference between a form field **that nobody filled in** and a field
where someone wrote **"none"**.

Destructuring a property that doesn't exist always gives you `undefined`:

```bash
node -e "const {name} = {age: 40}; console.log(name)"   # undefined
```

**It never gives you `null`.** If you see a `null`, someone sent it on purpose.

---

## `===` vs `==`

- `===` compares as-is: same value **and** same type.
- `==` **converts first** and then compares, with surprising rules.

```bash
node -e 'console.log(null == undefined, null === undefined)'   # true false
```

For `==`, `null` and `undefined` are the same thing. For `===`, they aren't.

**Rule: always use `===` and `!==`.** You almost never need `==`, and mixing
the two in the same function is asking for a bug.

---

## `typeof` returns a **string**

It doesn't return a type or a boolean. It returns a string.

```bash
node -e 'console.log(typeof "Ana", typeof 40, typeof undefined)'
# string number undefined
```

That's why `typeof name !== "string"` compares **two strings**, with quotes on
both sides. And that's why, if `name` is missing:

```
typeof name !== "string"
typeof undefined !== "string"
"undefined" !== "string"        ← two different strings
→ true
```

### Why do I need it if I already have TypeScript?

Because **TypeScript disappears when you compile**. It checks the code I write,
before the app starts. `req.body` comes from outside, over the network, and can
contain anything: TypeScript has never seen it.

TypeScript is the factory's quality control. `typeof` is the guard at the door.
The factory doesn't check what visitors bring in.

---

## `&&` vs `||`, and which level each one goes on

- `&&` → **all** of them must be true.
- `||` → **one** is enough.

The PATCH validation uses both, on different levels:

```ts
(name !== undefined && typeof name !== "string") || // ← && inside
  (age !== undefined && typeof age !== "number") || // ← || between
  (diagnosis !== undefined && typeof diagnosis !== "string");
```

**Inside** each pair of parentheses, `&&`: _"if the field is there AND it's wrong"_.
**Between** the parentheses, `||`: _"one failure is enough to reject"_.

If I put `&&` between all three, I'm saying "reject only if all three are wrong
at the same time", which isn't what I want.

### The `!== undefined` switch

```ts
name !== undefined && typeof name !== "string";
```

If `name` is missing, the first half is already false and the whole parenthesis
is `false` — **it doesn't even get to the `typeof`**. That's what makes a
field optional.

And the other way round: **the POST's required fields aren't written down
anywhere.** They come for free from _not_ adding that switch, because
`typeof undefined` is never `"string"`.

> POST: _"is everything here?"_ · PATCH: _"is what you brought correct?"_

---

## Parameters go by **position**, not by name

Express always calls it like this:

```
yourFunction(the_request, the_response, next)
```

The name I give them is a label I make up. It doesn't change what arrives. If I
write `(res: Response, req: Request, next)`, the variable called `res` holds the
request, and `req` holds the response.

It's a form with three boxes in a fixed order: if I label the first one
"surname", people will still write their first name there.

**Always `(req, res, next)`.** The one exception: the error middleware, which
takes four and the error goes first — `(err, req, res, next)`. Express tells
them apart **by counting the parameters**, so there you can't drop `next` even
if you don't use it.

---

## `export default` vs named `export`

|                        | How many          | When importing                       |
| ---------------------- | ----------------- | ------------------------------------ |
| `export default thing` | one per file      | no braces, and I pick the name       |
| `export { a, b }`      | as many as I want | **with braces** and their exact name |

`default` means "the main thing in this file", and there can't be two main
things. As soon as a file exports two functions, neither can be the default:
they're named exports.

`export` doesn't accept a bare name (`export myFunction;` isn't valid). Only:
`export default`, `export` + a declaration, or `export { ... }`.

---

## Mistakes I made (so I don't repeat them)

- **`export myFunction;`** → `TS1128: Declaration or statement expected`.
  `export` needs one of its three forms; a bare name isn't any of them.
- **`export function (myFunction);`** → `TS1003: Identifier expected`.
  `export function` **declares** a new function with its body; it can't point
  at one that already exists above.
- **Changing the `export` and forgetting the `import`.** The error moved to a
  different file: it stopped showing up in the middleware and started showing
  up in `routes.ts`. That means that side was already fine.
- **Parameters in the wrong order** → `Type 'Request' is missing the following
properties from type 'Response': status, send...`. Nothing was missing: I was
  looking for them on the wrong object.
- **Copying the POST validation into the PATCH.** It made all three fields
  required. A `PATCH {"age": 40}` answered 400.
- **Swapping `||` for `&&` between the conditions.** With `{"age": "thirty"}` it
  gave `true && true && false` → `false` → reached the SQL → 500. The original
  bug, untouched.
- **An invisible space in the message.** `"Invalid data "` and
  `"Invalid data"` are two different strings, and a `toEqual` catches it.

---

## How to read a TypeScript error

It's a **funnel**: the general stuff at the top, the specific stuff at the bottom.
**The cause is in the last line, the most indented one.** The lines above it are noise.

And the format `file.ts(30,18)` means **line 30, column 18**.

> The line number doesn't tell you which **function** you're in. A file with
> five functions is five independent boxes: find the function before reasoning
> about the change. (I lost half an hour on a `400` that was in `updatePatient`
> thinking it affected a test that went through `getPatientById`.)
