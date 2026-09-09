import dotenv from "dotenv";
const archivo = process.env.NODE_ENV === "test" ? ".env.test" : ".env";

dotenv.config({ path: archivo });
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`La variable de entorno ${name} no está definida`);
  }
  return value;
}
export const CORS_ORIGIN = requireEnv("CORS_ORIGIN");
export const JWT_SECRET = requireEnv("JWT_SECRET");
export const DATABASE_URL = requireEnv("DATABASE_URL");
export const RESEND_API_KEY = requireEnv("RESEND_API_KEY");
export const RESEND_FROM = requireEnv("RESEND_FROM");
