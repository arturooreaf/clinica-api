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

  next();
}

function validateUpdatePatient(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { name, age, diagnosis } = req.body;
  if (name === undefined && age === undefined && diagnosis === undefined) {
    return res.status(400).json({ error: "El campo está vacío" });
  }
  if (
    (name !== undefined && typeof name !== "string") ||
    (age !== undefined && typeof age !== "number") ||
    (diagnosis !== undefined && typeof diagnosis !== "string")
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }
  next();
}
export { validateCreatePatient, validateUpdatePatient };
