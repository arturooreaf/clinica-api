export interface Patient {
    id: number
    name: string
    age: number
    diagnosis?: string 
}

export interface CreatePatientInput {
    name: string
    age: number
    diagnosis?: string
}

export interface UpdatePatientInput {
  name?: string;
  age?: number;
  diagnosis?: string;
}