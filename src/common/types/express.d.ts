// Si el usuario decodificado tiene una estructura concreta, puedes adaptarla aquí
interface UserPayload {
  userId: number; // o string, dependiendo de cómo guardes el ID en tu JWT
  // añade aquí más campos si los usas (ej: role: string)
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload; // Opcional por si alguna ruta no pasa por auth
    }
  }
}
export {};
