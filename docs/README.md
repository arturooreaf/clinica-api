# Documentación del proyecto

Índice de toda la documentación. Si no sabes por dónde empezar, empieza aquí.

---

## Empezar una sesión de trabajo

Estos dos son el punto de entrada. Se leen juntos y en este orden:

| Documento                                  | Para qué                                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| [`contexto-mentor.md`](contexto-mentor.md) | Quién soy, cómo quiero que se me enseñe, y todo lo que ya sé (para que no me lo repitan) |
| [`continuar-aqui.md`](continuar-aqui.md)   | Dónde me quedé: estado real del proyecto, decisiones tomadas y plan de trabajo en orden  |

---

## Entender el proyecto

| Documento                            | Para qué                                                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`arquitectura.md`](arquitectura.md) | Las capas, qué hace y qué tiene prohibido cada una, el recorrido completo de una petición, y las preguntas que me pueden hacer en la defensa                              |
| [`openapi.yaml`](openapi.yaml)       | La especificación de la API. **No mover de aquí:** `src/app.ts` la lee al arrancar con `path.join(__dirname, "../docs/openapi.yaml")`; si no está, el servidor no levanta |

---

## Referencia del día a día

| Documento                                          | Para qué                                                                                                        |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [`referencia/comandos.md`](referencia/comandos.md) | Todos los comandos del proyecto: arranque, calidad, base de datos, Git, dependencias, y qué hacer si algo falla |
| [`referencia/api.md`](referencia/api.md)           | Guía de uso de los endpoints, con ejemplos de petición y respuesta                                              |
| [`referencia/pruebas.md`](referencia/pruebas.md)   | Secuencia de pruebas manuales con `curl`                                                                        |
| [`postman/`](postman/)                             | Colección exportada de Postman. Excluida de Prettier en `.prettierignore`                                       |

---

## Chuletas de repaso

Notas propias sobre lo que he ido aprendiendo. No son documentación del
proyecto: son para que no se me olvide.

| Documento                                          | Para qué                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------ |
| [`chuletas/tests.md`](chuletas/tests.md)           | Jest, supertest, las dos fases, qué testear y qué no                           |
| [`chuletas/javascript.md`](chuletas/javascript.md) | Mis puntos débiles de JavaScript base, con el error concreto que dio cada uno  |
| [`chuletas/entornos.md`](chuletas/entornos.md)     | Por qué existen `.env` y `.env.test`, y la cadena entera hasta la base de test |

---

## Estructura de esta carpeta

```
docs/
├── README.md              este índice
├── contexto-mentor.md     cómo enseñarme y qué sé ya
├── continuar-aqui.md      estado y plan de trabajo
├── arquitectura.md        cómo está montado por dentro
├── openapi.yaml           especificación de la API (NO MOVER)
├── postman/               colección exportada
├── referencia/            consulta del día a día
│   ├── comandos.md
│   ├── api.md
│   └── pruebas.md
└── chuletas/              apuntes de repaso
    ├── tests.md
    ├── javascript.md
    └── entornos.md
```

---

## Deuda de documentación conocida

- `referencia/api.md` y `referencia/pruebas.md` se solapan: los dos explican
  cómo probar los endpoints a mano con `curl`. Habría que fundirlos en uno o
  dejar claro qué cubre cada uno.
