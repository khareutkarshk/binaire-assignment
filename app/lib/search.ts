import { MAX_SEARCH_RESULTS, MAX_SUGGESTIONS } from "./constants";
import { compactTitles } from "./titles";
import type { MovieTitle } from "../types";

export function buildSearchIndex(titles: MovieTitle[]) {
  const map = new Map<string, MovieTitle[]>();

  for (const title of titles) {
    const tokens = [
      title.id,
      title.primaryTitle,
      title.originalTitle || "",
      String(title.startYear || ""),
      ...(title.genres || []),
    ]
      .join(" ")
      .toLowerCase()
      .split(/[\s:.,'"\-()]+/)
      .filter(Boolean);

    for (const token of new Set(tokens)) {
      const bucket = map.get(token) || [];
      bucket.push(title);
      map.set(token, bucket);
    }
  }

  return map;
}

export function searchLocal(
  titles: MovieTitle[],
  searchIndex: Map<string, MovieTitle[]>,
  query: string,
  remoteMatches: MovieTitle[] = [],
) {
  const term = query.trim().toLowerCase();
  if (!term) {
    return [];
  }

  const tokenMatches = term
    .split(/\s+/)
    .flatMap((token) => searchIndex.get(token) || []);

  const directMatches = titles.filter((title) => {
    const year = String(title.startYear || "");
    return (
      title.id.toLowerCase().includes(term) ||
      title.primaryTitle.toLowerCase().includes(term) ||
      year.includes(term)
    );
  });

  return compactTitles([...tokenMatches, ...directMatches, ...remoteMatches]).slice(
    0,
    MAX_SEARCH_RESULTS,
  );
}

export function getSuggestions(results: MovieTitle[]) {
  return results.slice(0, MAX_SUGGESTIONS);
}
