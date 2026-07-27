import type { Request, Response, NextFunction } from "express";

// Un middleware de ejemplo: solo imprime en consola cada petición que llega
function logger(req: Request, res: Response, next: NextFunction) {
  console.log(`${req.method} ${req.url}`); // ej: "GET /patients/1"
  next(); // sin esto, la petición se quedaría atascada aquí para siempre
}





function validateCreatePatient(req: Request, res: Response, next: NextFunction) {
  const { name, age, diagnosis } = req.body;
  // aquí van las mismas comprobaciones typeof que ya tienes en el controller
  // si algo falla: res.status(400)... y NO llamamos a next()
  // si todo está bien: next(); y deja pasar al controller
}

export default validateCreatePatient;