import express from "express";
import patientRoutes from "./routes/patient.routes"
const app = express();
const port = 3000;
//middleware 
app.use(express.json());
app.use ("/patients",patientRoutes)
app.get('/', (_req, res) => {
  res.send('Bienvenido a Careexpand ')
})
app.use("/patients", patientRoutes);
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})