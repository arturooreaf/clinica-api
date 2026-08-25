import type { Request, Response } from "express";
import * as authService from "./auth.service";
import { logger } from "../../common/logger";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    const newUser = await authService.register({ email, password, name });
    if (!newUser) {
      return res.status(409).json({ error: "El email ya esta registrado" });
    }
    res.status(201).json(newUser);
  } catch (error) {
    logger.error({ err: error }, "Error al registrar el usuario");
    res.status(500).json({ error: "Error al registrar el usuario" });
  }
}
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    if (!result) {
      return res.status(401).json({ error: "Malas credenciales" });
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, "Error al iniciar sesión");
    res.status(500).json({ error: "Error al iniciar sesión" });
  }
}

