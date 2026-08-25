import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepository from "./infra/repositories/user.repository";
import { logger } from "../../common/logger";
import {
  LoginInput,
  LoginResult,
  RegisterUserInput,
  UserView,
} from "./types/user.types";

import { JWT_SECRET } from "../../common/config/env";

export async function register(
  data: RegisterUserInput,
): Promise<UserView | null> {
  const userExisting = await userRepository.findByEmail(data.email);
  if (userExisting) {
    logger.warn(
      { email: data.email },
      "Registro rechazado: el email ya existe",
    );
    return null;
  }

  const password_hash = await bcrypt.hash(data.password, 10);

  const newUser = await userRepository.create({
    email: data.email,
    password_hash,
    name: data.name,
  });

  logger.info({ userId: newUser.id }, "Usuario registrado");

  return { id: newUser.id, email: newUser.email, name: newUser.name };
}

export async function login(data: LoginInput): Promise<LoginResult | null> {
  const user = await userRepository.findByEmail(data.email);
  if (!user) {
    logger.warn({ email: data.email }, "Login fallido: el email no existe");
    return null;
  }

  const passwordMatches = await bcrypt.compare(
    data.password,
    user.password_hash,
  );
  if (!passwordMatches) {
    logger.warn({ userId: user.id }, "Login fallido: contraseña incorrecta");
    return null;
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

  logger.info({ userId: user.id }, "Login correcto");

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
