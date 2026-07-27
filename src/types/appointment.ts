export interface Appointment {
id: number
patient_id: number
date: Date
reason?: string
}
export interface createAppointment {
    date: Date
    reason?: string
    
}