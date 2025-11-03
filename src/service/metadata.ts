// src/service/metadata.ts
import api from "@/service/api";

/**
 * The backend returns a simple string[].
 * Keep the model minimal at the service layer.
 */
export type CompetitionId = string;

/**
 * Optional params for server-side filtering/pagination.
 * Adjust names to whatever your backend expects.
 */
export interface FetchCompetitionIdsParams {
  /** Free-text search query (e.g. ?q=prem) */
  search?: string;
  /** Limit number of results (e.g. ?limit=50) */
  limit?: number;
  /** Pass AbortSignal if you want to cancel in-flight requests */
  signal?: AbortSignal;
}

/**
 * Fetch list of competition IDs.
 * Adjust the URL and query param names to match your backend.
 * Examples:
 *   GET /metadata/competitions
 *   GET /competitions?onlyIds=true
 */
export async function fetchCompetitionIds(
  params?: FetchCompetitionIdsParams
): Promise<CompetitionId[]> {
  const { search, limit, signal } = params ?? {};
  const { data } = await api.get<CompetitionId[]>(
    "/metadata/soccer/leagues",
    {
      params: {
        q: search,
        limit,
      },
      signal,
    }
  );
  // Ensure we always return an array
  return Array.isArray(data) ? data : [];
}
