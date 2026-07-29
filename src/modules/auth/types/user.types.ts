export interface User{
    id: number
    email: string 
    password_hash: string 
    name: string
}

export interface RegisterUserInput {
    email: string
    password:string
    name:string 
}

export interface CreateUserInput {
    email: string 
    password_hash: string 
    name: string
}
export interface UserView {
    id: number
    email: string
    name: string
}