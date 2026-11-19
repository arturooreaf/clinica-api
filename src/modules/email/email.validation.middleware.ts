import type { Request, Response, NextFunction } from "express";

function validateSendEmail(req: Request, res: Response, next: NextFunction) {
  const { to, subject, text } = req.body;

  if (
    typeof to !== "string" ||
    typeof subject !== "string" ||
    typeof text !== "string"
  ) {
    return res.status(400).json({ error: "Invalid data" });
  }

  if (to.trim() === "" || subject.trim() === "" || text.trim() === "") {
    return res.status(400).json({ error: "Fields cannot be empty" });
  }

  if (!to.includes("@")) {
    return res.status(400).json({ error: "Recipient is not a valid email" });
  }

  next();
}

export default validateSendEmail;
