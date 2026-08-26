import type { Request, Response } from "express";
import * as emailService from "./email.service";
import { logger } from "../../common/logger";

export async function sendEmail(req: Request, res: Response) {
  try {
    const { to, subject, text } = req.body;
    const result = await emailService.sendEmail({ to, subject, text });

    if (!result) {
      return res.status(502).json({ error: "No se pudo enviar el correo" });
    }

    res.status(202).json(result);
  } catch (error) {
    logger.error({ err: error }, "Error al enviar el correo");
    res.status(500).json({ error: "Error al enviar el correo" });
  }
}
