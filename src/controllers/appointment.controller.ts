import type { Request, Response } from "express";
import * as appointmentService from  "../services/appointments.service";

export async function getAppointments(_req:Request, res: Response) {
    try{
    const appointment = await appointmentService.listAppointments();
    res.status(200).json(appointment)
    } catch (error){
      console.error(error);
      res.status(500).json({error:" Error al obtener las citas"});
    }
}

export async function getAppointmentById(req:Request, res: Response) {
    try {
        const id = Number(req.params.id);
    if(Number.isNaN(id)){
    return res.status(400).json({error: "el id debe ser un numero"})
    }
    const appointment = await appointmentService.getAppointmentById(id)
        if(!appointment){
            return res.status(404).json({error: "Cita no encontrada"})
        }
        res.status(200).json(appointment)
    }catch(error) {
  console.error(error);
    res.status(500).json({ error: "Error al obtener la cita" });
    }
}

export async function createAppointment(req: Request, res: Response) {
     try {
        const {patient_id, date, reason} = req.body;
        const newAppointment = await appointmentService.createAppointment({patient_id, date, reason})
        res.status(201).json(newAppointment)
     } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al crear la cita" });
  }
}

export async function updateAppointment(req: Request, res: Response){
    try{
       const id = Number(req.params.id)
       if(Number.isNaN(id)) {
        return res.status(400).json({error: "el id debe ser un numero"})
       }
        const update = await appointmentService.updateAppointment(id, req.body)
        if(!update){
       return  res.status(404).json({error: "cita no encontrada"})
        }

res.status(200).json(update)
    }catch (error){
  console.error(error);
    res.status(500).json({ error: "Error al actualizar la cita" });
    }
 }

 export async function deleteAppointment(req: Request, res: Response){
    try{
    const id = Number(req.params.id)
    if (Number.isNaN(id)){
        return res.status(400).json ({error: "Necesita ser un numero"})
    }
    const remove = await appointmentService.deleteAppointment(id)
    if(!remove) 
        return res.status(404).json({error: "cita no encontrada"})
                                                                                                                                                              
            res.status(204).send();
        
    }catch(error){
          console.error(error);
    res.status(500).json({ error: "Error al borrar la cita " });
    }
}
 