import api from '@/service/api.ts'
import type { CreateUserPayload, UpdateUserPayload, Px75User } from '@/types/users.ts'

// --- add function ---
export async function createUser(payload: CreateUserPayload): Promise<Px75User> {
  const { data } = await api.post('/user', payload)
  return data
}

export async function fetchUser(id: number): Promise<Px75User> {
  const { data } = await api.get(`/user/${id}`)
  return data
}

export async function updateUser(id: number, payload: UpdateUserPayload) {
  // No per-request XSRF options needed now; the instance handles it
  const { data } = await api.put(`/user/${id}`, payload)
  return data
}

export async function resetUserPassword(id: number, password: string): Promise<Px75User> {
  const { data } = await api.patch(`/user/${id}/password`, { password })
  return data
}

export async function deleteUser(id: number): Promise<void> {
  await api.delete(`/user/${id}`)
}

export async function fetchUsers(): Promise<Px75User[]> {
  const { data } = await api.get<Px75User[]>('/user')
  return data
}
