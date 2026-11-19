import type { Request, Response, NextFunction } from "express";

// Route middleware: only mounted on the create-patient POST
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
    return res.status(400).json({ error: "Invalid data" });
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
    return res.status(400).json({ error: "Field is empty" });
  }
  if (
    (name !== undefined && typeof name !== "string") ||
    (age !== undefined && typeof age !== "number") ||
    (diagnosis !== undefined && typeof diagnosis !== "string")
  ) {
    return res.status(400).json({ error: "Invalid data" });
  }
  next();
}
export { validateCreatePatient, validateUpdatePatient };
