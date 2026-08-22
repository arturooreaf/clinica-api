import cors from "cors";
import { CORS_ORIGIN } from "../config/env";

export const corsMiddleware = cors({
  origin: CORS_ORIGIN.split(","),
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE"],
});
