import { API_BASE, PAGE_LIMIT } from "./constants";
import type { MovieTitle } from "../types";

export type TitlesResponse = {
  titles?: MovieTitle[];
  totalCount?: number;
  nextPageToken?: string;
  code?: number;
  message?: string;
};

export function isRateLimitError(message: string) {
  return message.endsWith(":429");
}

export function isNetworkError(message: string) {
  return (
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Network request failed")
  );
}

export async function fetchTitles(pageToken?: string, signal?: AbortSignal) {
  const params = new URLSearchParams();
  params.append("types", "MOVIE");
  params.append("types", "TV_SERIES");
  params.set("sortBy", "SORT_BY_POPULARITY");
  params.set("sortOrder", "DESC");

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const response = await fetch(`${API_BASE}/titles?${params}`, {
    cache: "no-store",
    signal,
  });

  const payload = (await response.json()) as TitlesResponse;

  if (
    payload.code === 13 ||
    payload.message?.toLowerCase().includes("too many network requests") ||
    payload.message?.toLowerCase().includes("429")
  ) {
    throw new Error("Unable to load titles:429");
  }

  if (!response.ok) {
    throw new Error(`Unable to load titles:${response.status}`);
  }

  return payload;
}

export async function searchRemote(query: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ query, limit: String(PAGE_LIMIT) });
  const response = await fetch(`${API_BASE}/search/titles?${params}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as TitlesResponse;
  return payload.titles || [];
}
