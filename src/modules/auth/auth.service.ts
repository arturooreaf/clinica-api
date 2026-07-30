import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userRepository from "./infra/repositories/user.repository";
import {
  LoginInput,
  LoginResult,
  RegisterUserInput,
  UserView,
} from "./types/user.types";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable de entorno ${name} no está definida`);
  }
  return value;
}

const JWT_SECRET = requireEnv("JWT_SECRET");

export async function register(
  data: RegisterUserInput,
): Promise<UserView | null> {
  const userExisting = await userRepository.findByEmail(data.email);
  if (userExisting) return null;

  const password_hash = await bcrypt.hash(data.password, 10);

  const newUser = await userRepository.create({
    email: data.email,
    password_hash,
    name: data.name,
  });

  return { id: newUser.id, email: newUser.email, name: newUser.name };
}

export async function login(data: LoginInput): Promise<LoginResult | null> {
  const user = await userRepository.findByEmail(data.email);
  if (!user) return null;

  const passwordMatches = await bcrypt.compare(
    data.password,
    user.password_hash,
  );
  if (!passwordMatches) return null;

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "1h" });

  return {
    token,
    user: { id: user.id, email: user.email, name: user.name },
  };
}


