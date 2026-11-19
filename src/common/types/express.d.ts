// If the decoded user has a specific shape, adapt it here
interface UserPayload {
  userId: number; // or string, depending on how the ID is stored in the JWT
  // add more fields here if you use them (e.g. role: string)
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload; // Optional in case a route does not go through auth
    }
  }
}
export {};
