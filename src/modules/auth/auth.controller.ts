import type { Request, Response } from "express";
import * as authService from "./auth.service";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    const newUser = await authService.register({ email, password, name });
    if (!newUser) {
      return res.status(409).json({ error: "El email ya esta registrado" });
    }
    res.status(201).json(newUser);
  } catch (error) {
    console.error(error);
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
    console.error(error);
    res.status(500).json({ error: "Error al  iniciar sesion" });
  }
}
