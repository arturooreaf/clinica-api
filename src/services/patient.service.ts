import * as patientData from "../repository/patient.data"
import {Patient, CreatePatientInput, UpdatePatientInput} from "../types/patient"

export async function listPatients(): Promise <Patient[]> {
    return patientData.getAll();
}
export async function getPatientById(id:number): Promise <Patient | undefined>{
    return patientData.getById(id);
}
export async function createPatient (data: CreatePatientInput): Promise <Patient>{
    return patientData.create(data);
}
export async function updatePatient(id:number, data: UpdatePatientInput): Promise <Patient | undefined> {
    return patientData.update(id, data);
    
}
 export async function deletePatient (id:number):Promise<boolean> {
return patientData.remove(id);
 }
