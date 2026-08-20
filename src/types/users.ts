export type Role = string

export interface Px75User {
  id: number
  username: string
  email: string
  roles: Role[]
}

export type User = Px75User

export interface CreateUserPayload {
  username: string
  email: string
  password: string
  roles?: Role[]
}

export interface UpdateUserPayload {
  username?: string
  email?: string
  roles?: Role[]
  password?: string
}
