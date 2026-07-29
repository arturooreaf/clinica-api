import * as AppointmentData from  "./infra/repositories/appointment.repository"
import { Appointment, UpdateAppointment, CreateAppointment } from "./types/appointment.types"

export async function listAppointments():Promise <Appointment[]> {
    return AppointmentData.getAll();
}
export async function getAppointmentById(id:number): Promise <Appointment | undefined>{
    return AppointmentData.getById(id)
}
export async function createAppointment(data:CreateAppointment): Promise <Appointment> {
    return AppointmentData.create(data)
    
}
export async function updateAppointment (id: number, data:UpdateAppointment): Promise<Appointment | undefined>{
    return AppointmentData.update(id, data)
}
export async function deleteAppointment (id:number): Promise <boolean>{
    return AppointmentData.remove(id)
}