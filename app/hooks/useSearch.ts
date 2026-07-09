import { useEffect, useMemo, useState } from "react";
import { SEARCH_DEBOUNCE_MS } from "../lib/constants";
import { searchRemote } from "../lib/imdb.api";
import { buildSearchIndex, getSuggestions, searchLocal } from "../lib/search";
import type { MovieTitle } from "../types";

type UseSearchOptions = {
  titles: MovieTitle[];
  updateConnectionState: (online: boolean) => void;
};

export function useSearch({ titles, updateConnectionState }: UseSearchOptions) {
  const [query, setQuery] = useState("");
  const [remoteMatches, setRemoteMatches] = useState<MovieTitle[]>([]);

  const searchIndex = useMemo(() => buildSearchIndex(titles), [titles]);

  const searchResults = useMemo(() => {
    const activeRemoteMatches = query.trim() ? remoteMatches : [];
    return searchLocal(titles, searchIndex, query, activeRemoteMatches);
  }, [titles, searchIndex, query, remoteMatches]);

  const suggestions = useMemo(() => getSuggestions(searchResults), [searchResults]);

  useEffect(() => {
    if (!query.trim()) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      updateConnectionState(browserOnline);

      if (!browserOnline) {
        setRemoteMatches([]);
        return;
      }

      try {
        const matches = await searchRemote(query.trim(), controller.signal);
        updateConnectionState(true);
        setRemoteMatches(matches);
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }
        updateConnectionState(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, updateConnectionState]);

  return {
    query,
    setQuery,
    searchResults,
    suggestions,
  };
}
