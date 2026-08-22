import rateLimit from "express-rate-limit";

// Estricto: solo para login y registro
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: { error: "Demasiados intentos. Inténtalo de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Solo cuentan los intentos que fallan
});

// General: para el resto de la API
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: { error: "Demasiadas peticiones. Inténtalo de nuevo más tarde." },
  standardHeaders: true,
  legacyHeaders: false,
});
