import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  INITIAL_VISIBLE,
  REQUEST_COOLDOWN_MS,
  TARGET_LIBRARY_SIZE,
  VISIBLE_INCREMENT,
} from "../lib/constants";
import { readCachedTitles, writeCachedTitles } from "../lib/cache";
import { fetchTitles, isNetworkError, isRateLimitError } from "../lib/imdb.api";
import { mergeTitles } from "../lib/titles";
import type { MovieTitle } from "../types";

type LoadState = "idle" | "loading" | "ready" | "error";

type UseTitlesOptions = {
  enabled: boolean;
  hasHydrated: boolean;
  updateConnectionState: (online: boolean) => void;
};

export function useTitles({ enabled, hasHydrated, updateConnectionState }: UseTitlesOptions) {
  const [titles, setTitles] = useState<MovieTitle[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [lastUpdated, setLastUpdated] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiNotice, setApiNotice] = useState("");

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titlesRef = useRef<MovieTitle[]>(titles);
  const nextPageTokenRef = useRef<string | undefined>(nextPageToken);
  const cooldownUntilRef = useRef(0);
  const hasAttemptedInitialLoadRef = useRef(false);
  const prefetchTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const timer = window.setTimeout(() => {
      const cached = readCachedTitles();
      setTitles(cached.titles);
      setNextPageToken(cached.nextPageToken);
      setLastUpdated(cached.lastUpdated);
      setLoadState(cached.titles.length ? "ready" : "idle");
    }, 0);

    return () => window.clearTimeout(timer);
  }, [hasHydrated]);

  useEffect(() => {
    titlesRef.current = titles;
  }, [titles]);

  useEffect(() => {
    nextPageTokenRef.current = nextPageToken;
  }, [nextPageToken]);

  const refreshTitles = useCallback(
    async (forceFirstPage = false) => {
      const browserOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      updateConnectionState(browserOnline);

      if (!browserOnline) {
        setApiNotice("You are offline. Cached titles remain available.");
        return;
      }

      if (Date.now() < cooldownUntilRef.current) {
        setApiNotice("IMDb is rate limiting requests. Try loading more again in a minute.");
        return;
      }

      if (abortRef.current) {
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      setApiNotice("");
      setLoadState((state) => (state === "ready" ? state : "loading"));
      setIsRefreshing(true);

      try {
        const token = forceFirstPage ? undefined : nextPageTokenRef.current;
        const payload = await fetchTitles(token, controller.signal);
        const currentTitles = forceFirstPage ? [] : titlesRef.current;
        updateConnectionState(true);

        const merged = mergeTitles(currentTitles, payload.titles || []);
        const updatedAt = new Date().toLocaleString([], {
          dateStyle: "medium",
          timeStyle: "short",
        });

        titlesRef.current = merged;
        nextPageTokenRef.current = payload.nextPageToken;
        setTitles(merged);
        setNextPageToken(payload.nextPageToken);
        setLastUpdated(updatedAt);
        setLoadState("ready");
        writeCachedTitles(merged, payload.nextPageToken, updatedAt);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          const message = (error as Error).message;

          if (isRateLimitError(message)) {
            cooldownUntilRef.current = Date.now() + REQUEST_COOLDOWN_MS;
            setApiNotice("IMDb is rate limiting requests. Showing cached titles for now.");
          } else if (isNetworkError(message) || !navigator.onLine) {
            updateConnectionState(false);
            setApiNotice("You are offline. Cached titles remain available.");
          } else {
            setApiNotice("Could not update the library. Cached titles are still available.");
          }

          setLoadState(titlesRef.current.length ? "ready" : "error");
        }
      } finally {
        abortRef.current = null;
        setIsRefreshing(false);
      }
    },
    [updateConnectionState],
  );

  const handleReconnect = useCallback(() => {
    setApiNotice("Back online — updating library…");
    void refreshTitles(true);
  }, [refreshTitles]);

  useEffect(() => {
    if (!enabled) {
      hasAttemptedInitialLoadRef.current = false;
      return;
    }

    if (
      !hasHydrated ||
      titles.length > 0 ||
      hasAttemptedInitialLoadRef.current ||
      abortRef.current
    ) {
      return;
    }

    hasAttemptedInitialLoadRef.current = true;
    void refreshTitles(true);
  }, [enabled, hasHydrated, titles.length, refreshTitles]);

  const loadMoreTitles = useCallback(() => {
    if (isRefreshing || abortRef.current) {
      return;
    }

    if (titlesRef.current.length === 0) {
      void refreshTitles(true);
      return;
    }

    setVisibleCount((count) =>
      Math.min(count + VISIBLE_INCREMENT, titlesRef.current.length + VISIBLE_INCREMENT),
    );

    if (nextPageTokenRef.current) {
      void refreshTitles();
    }
  }, [isRefreshing, refreshTitles]);

  useEffect(() => {
    if (!enabled || loadState !== "ready" || isRefreshing || abortRef.current) {
      return;
    }

    if (titlesRef.current.length >= TARGET_LIBRARY_SIZE || !nextPageTokenRef.current) {
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    if (Date.now() < cooldownUntilRef.current) {
      return;
    }

    prefetchTimerRef.current = window.setTimeout(() => {
      void refreshTitles();
    }, 2000);

    return () => {
      if (prefetchTimerRef.current) {
        window.clearTimeout(prefetchTimerRef.current);
      }
    };
  }, [enabled, loadState, isRefreshing, titles.length, nextPageToken, refreshTitles]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !enabled) {
      return;
    }

    if (titles.length === 0 || !nextPageToken || loadState !== "ready") {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreTitles();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, loadMoreTitles, titles.length, nextPageToken, loadState]);

  const visibleTitles = useMemo(
    () => titles.slice(0, visibleCount),
    [titles, visibleCount],
  );

  const shouldShowRetryButton = loadState === "error" && titles.length === 0;

  return {
    titles,
    visibleTitles,
    loadState,
    nextPageToken,
    lastUpdated,
    isRefreshing,
    apiNotice,
    sentinelRef,
    shouldShowRetryButton,
    refreshTitles,
    loadMoreTitles,
    handleReconnect,
  };
}
