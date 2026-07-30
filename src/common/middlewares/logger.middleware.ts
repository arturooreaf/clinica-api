import type { Request, Response, NextFunction } from "express";

// Middleware global: se ejecuta en TODAS las peticiones (si se monta sin ruta en app.use)
function logger(req: Request, res: Response, next: NextFunction) {
  // req.method = el verbo HTTP (GET, POST...); req.url = la ruta pedida
  console.log(`${req.method} ${req.url}`); // ej: "GET /patients/1"
  // No decide nada, siempre deja pasar. Sin next(), la petición se queda colgada para siempre
  next();
}

export default logger;


/**** Crea src/common/middlewares/auth.middleware.ts.

Es el patrón de middleware que ya conoces (req, res, next), con cuatro pasos dentro:

A) Leer el header. El token llega así: Authorization: Bearer eyJhbGci.... 
En Express lo lees con req.headers.authorization (en minúsculas, siempre).

B) Comprobar que existe y tiene el formato correcto. Si no hay header, o no empieza por "Bearer ", → 401.

C) Extraer el token. El header es una sola cadena: "Bearer eyJhbGci...". 
Hay que quedarse solo con la segunda parte, la de después del espacio. Se hace con .split(" ")[1] — split parte el texto por los espacios y devuelve un array, y [1] coge el segundo elemento (el [0] sería "Bearer").

D) Verificar la firma. jwt.verify(token, JWT_SECRET).
 Aquí hay algo importante: jwt.verify LANZA una excepción si el token es inválido o ha caducado, no devuelve false. 
 Así que va dentro de un try/catch: si lanza, respondes 401; si no lanza, llamas a next().

Los imports que necesitas: Request, Response, NextFunction de express; jwt de jsonwebtoken; 
y JWT_SECRET de ../config/env (fíjate: solo un nivel, porque middlewares/ y config/ son hermanas dentro de common/).


import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // HUECO A: guarda el header en una variable
  //          const authHeader = req.headers.authorization;

  // HUECO B: si NO hay header, o NO empieza por "Bearer ", corta con 401
  //          pista: !authHeader || !authHeader.startsWith("Bearer ")
  //          mensaje: "Token no proporcionado"

  // HUECO C: extrae el token quedándote con la parte después del espacio
  //          const token = authHeader.split(" ")[1];

  try {
    // HUECO D: verifica el token
    //          jwt.verify(token, JWT_SECRET);

    // HUECO E: si llegó aquí, el token es válido → deja pasar
  } catch {
    // HUECO F: el token es inválido o ha caducado → 401
    //          mensaje: "Token inválido o expirado"
  }
}





*/