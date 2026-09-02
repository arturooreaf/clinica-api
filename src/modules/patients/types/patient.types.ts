export interface Patient {
  id: number;
  name: string;
  age: number;
  diagnosis?: string;
  owner_id: number;
}

export interface CreatePatientInput {
  name: string;
  age: number;
  diagnosis?: string;
}

export interface UpdatePatientInput {
  name?: string;
  age?: number;
  diagnosis?: string;
}
