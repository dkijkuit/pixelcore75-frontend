// src/service/metadata.ts
import api from '@/service/api'

/**
 * A soccer competition as returned by the backend metadata endpoint.
 */
export interface Competition {
  id: string
  name: string
}

/**
 * Optional params for server-side filtering/pagination.
 * Adjust names to whatever your backend expects.
 */
export interface FetchCompetitionsParams {
  /** Free-text search query (e.g. ?q=prem) */
  search?: string
  /** Limit number of results (e.g. ?limit=50) */
  limit?: number
  /** Pass AbortSignal if you want to cancel in-flight requests */
  signal?: AbortSignal
}

/**
 * Fetch the list of soccer competitions (leagues).
 */
export async function fetchCompetitions(params?: FetchCompetitionsParams): Promise<Competition[]> {
  const { search, limit, signal } = params ?? {}
  const { data } = await api.get<Competition[]>('/metadata/soccer/leagues', {
    params: {
      q: search,
      limit,
    },
    signal,
  })
  // Ensure we always return an array
  return Array.isArray(data) ? data : []
}

/**
 * A soccer team as returned by the backend metadata endpoint.
 */
export interface SoccerTeam {
  id: string
  name: string
}

/**
 * Fetch the teams of a competition (e.g. ?competition=eng.1).
 * Returns an empty list when no competition is given.
 */
export async function fetchSoccerTeams(
  competition: string,
  signal?: AbortSignal,
): Promise<SoccerTeam[]> {
  if (!competition) return []

  const { data } = await api.get<SoccerTeam[]>('/metadata/soccer/teams', {
    params: { competition },
    signal,
  })
  // Ensure we always return an array
  return Array.isArray(data) ? data : []
}

/**
 * A crypto coin as returned by the backend metadata endpoint
 * (top coins by market cap from the crypto API client).
 */
export interface CryptoCoin {
  id: string
  symbol: string
  name: string
}

/**
 * A supported display currency as returned by the backend metadata endpoint.
 * `name` is the enum value the screen config expects, `symbol` is e.g. "€".
 */
export interface CryptoCurrency {
  name: string
  symbol: string
}

/**
 * Fetch the top coins (CoinGecko ids) for the crypto ticker screen.
 */
export async function fetchCryptoCoins(signal?: AbortSignal): Promise<CryptoCoin[]> {
  const { data } = await api.get<CryptoCoin[]>('/metadata/crypto/coins', { signal })
  return Array.isArray(data) ? data : []
}

/**
 * Fetch the currencies supported by the crypto ticker screen.
 */
export async function fetchCryptoCurrencies(signal?: AbortSignal): Promise<CryptoCurrency[]> {
  const { data } = await api.get<CryptoCurrency[]>('/metadata/crypto/currencies', { signal })
  return Array.isArray(data) ? data : []
}
