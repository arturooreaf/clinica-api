import type { Request, Response, NextFunction } from "express";

function validateSendEmail(req: Request, res: Response, next: NextFunction) {
  const { to, subject, text } = req.body;

  if (
    typeof to !== "string" ||
    typeof subject !== "string" ||
    typeof text !== "string"
  ) {
    return res.status(400).json({ error: "Datos inválidos" });
  }

  if (to.trim() === "" || subject.trim() === "" || text.trim() === "") {
    return res.status(400).json({ error: "Los campos no pueden estar vacíos" });
  }

  if (!to.includes("@")) {
    return res
      .status(400)
      .json({ error: "El destinatario no es un email válido" });
  }

  next();
}

export default validateSendEmail;
