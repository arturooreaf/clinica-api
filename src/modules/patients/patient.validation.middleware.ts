import type { Request, Response, NextFunction } from "express";

// Middleware de ruta: se monta solo en el POST de crear paciente
function validateCreatePatient(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { name, age, diagnosis } = req.body;
  if (
    typeof name !== "string" ||
    typeof age !== "number" ||
    (diagnosis !== undefined && typeof diagnosis !== "string")
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  // Si llegamos aquí, los datos son válidos: dejamos pasar al controller
  next();
}

export default validateCreatePatient;
