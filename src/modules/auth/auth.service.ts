import bcrypt from "bcrypt"
import * as userRepository from "./infra/repositories/user.repository";
import { CreateUserInput, RegisterUserInput, UserView } from "./types/user.types";

export async function register(data:RegisterUserInput): Promise <UserView | null> {
    const userExisting  = await userRepository.findByEmail(data.email)

    if(userExisting) return null;
     const password_hash = await bcrypt.hash(data.password, 10)
     const newUser = await userRepository.create({email: data.email, password_hash, name: data.name })

     return {id: newUser.id, email: newUser.email, name: newUser.name}
}