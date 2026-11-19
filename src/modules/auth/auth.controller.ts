import type { Request, Response } from "express";
import * as authService from "./auth.service";
import { logger } from "../../common/logger";

export async function register(req: Request, res: Response) {
  try {
    const { email, password, name } = req.body;
    const newUser = await authService.register({ email, password, name });
    if (!newUser) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    res.status(201).json(newUser);
  } catch (error) {
    logger.error({ err: error }, "Error registering user");
    res.status(500).json({ error: "Error registering user" });
  }
}
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    if (!result) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.status(200).json(result);
  } catch (error) {
    logger.error({ err: error }, "Error logging in");
    res.status(500).json({ error: "Error logging in" });
  }
}
