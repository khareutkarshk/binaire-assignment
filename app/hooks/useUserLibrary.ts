import { useCallback, useEffect, useMemo, useState } from "react";
import { readHistory, readWatchlist, writeHistory, writeWatchlist } from "../lib/cache";
import type { MovieTitle } from "../types";
import { buildTitleById, resolveTitles } from "../lib/titles";

type UseUserLibraryOptions = {
  uid: string;
  titles: MovieTitle[];
};

export function useUserLibrary({ uid, titles }: UseUserLibraryOptions) {
  const [watchlistIds, setWatchlistIds] = useState<string[]>([]);
  const [historyIds, setHistoryIds] = useState<string[]>([]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!uid) {
        setWatchlistIds([]);
        setHistoryIds([]);
        return;
      }

      setWatchlistIds(readWatchlist(uid));
      setHistoryIds(readHistory(uid));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [uid]);

  const watchlist = useMemo(() => new Set(watchlistIds), [watchlistIds]);

  const titleById = useMemo(() => buildTitleById(titles), [titles]);

  const continueWatching = useMemo(
    () => resolveTitles(historyIds, titleById),
    [historyIds, titleById],
  );

  const savedTitles = useMemo(
    () => resolveTitles(watchlistIds, titleById),
    [watchlistIds, titleById],
  );

  const openTitle = useCallback(
    (title: MovieTitle) => {
      if (!uid) {
        return title;
      }

      const nextHistory = [title.id, ...historyIds.filter((id) => id !== title.id)];
      setHistoryIds(nextHistory);
      writeHistory(uid, nextHistory);
      return title;
    },
    [uid, historyIds],
  );

  const toggleWatchlist = useCallback(
    (id: string) => {
      if (!uid) {
        return;
      }

      const nextWatchlist = watchlistIds.includes(id)
        ? watchlistIds.filter((item) => item !== id)
        : [id, ...watchlistIds];

      setWatchlistIds(nextWatchlist);
      writeWatchlist(uid, nextWatchlist);
    },
    [uid, watchlistIds],
  );

  return {
    watchlist,
    watchlistIds,
    historyIds,
    continueWatching,
    savedTitles,
    titleById,
    openTitle,
    toggleWatchlist,
  };
}
