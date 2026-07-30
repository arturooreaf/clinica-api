export interface Appointment {
  id: number;
  patient_id: number;
  date: Date;
  reason?: string;
}
export interface CreateAppointment {
  patient_id: number;
  date: Date;
  reason?: string;
}
export interface UpdateAppointment {
  date?: Date;
  reason?: string;
}
