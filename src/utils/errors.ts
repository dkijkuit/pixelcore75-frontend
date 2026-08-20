import { isAxiosError } from 'axios'

export function getErrorMessage(e: unknown, fallback: string): string {
  if (isAxiosError(e)) {
    const message = e.response?.data?.message
    if (typeof message === 'string' && message) return message
  }
  return fallback
}
