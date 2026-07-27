import express from "express";
import patientRoutes from "./routes/patient.routes"
import logger from "./middlewares/logger.middleware"

import errorHandle from "./middlewares/error.middleware";
const app = express();
const port = 3000;



//middleware 
app.use(express.json());
app.use (logger)
app.use ("/patients",patientRoutes)
app.use(errorHandle)



app.get('/', (_req, res) => {
  res.send('Bienvenido a Careexpand ')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

