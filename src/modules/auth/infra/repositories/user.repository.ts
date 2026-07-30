import {pool} from "../../../../database/pool"
import {User, CreateUserInput} from "../../types/user.types"


export async function findByEmail(email:string):Promise <User | undefined> {
    const result = await pool.query(
        "SELECT * FROM users WHERE email = $1", [email]
    )
    return  result.rows[0] as User | undefined
}

export async function create(data:CreateUserInput): Promise <User> {
    const result = await pool.query(
        "INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, email, password_hash, name", [data.email, data.password_hash, data.name]
    )
    return result.rows[0] as User
}