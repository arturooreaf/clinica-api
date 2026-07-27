import type { Request, Response, NextFunction } from "express";

// Middleware global: se ejecuta en TODAS las peticiones (si se monta sin ruta en app.use)
function logger(req: Request, res: Response, next: NextFunction) {
  // req.method = el verbo HTTP (GET, POST...); req.url = la ruta pedida
  console.log(`${req.method} ${req.url}`); // ej: "GET /patients/1"
  // No decide nada, siempre deja pasar. Sin next(), la petición se queda colgada para siempre
  next();
}


export default logger;