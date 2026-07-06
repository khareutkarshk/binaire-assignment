"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createUserWithEmailAndPassword,
  getFirebaseAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "./firebase";
import { AuthScreen } from "./components/AuthScreen";
import { DetailModal } from "./components/DetailModal";
import { Sidebar } from "./components/Sidebar";
import { TitleCard } from "./components/TitleCard";
import { TitleRail } from "./components/TitleRail";
import { displayType, runtimeLabel } from "./lib/media";
import type { LocalUser, MovieTitle, View } from "./types";

type TitlesResponse = {
  titles?: MovieTitle[];
  totalCount?: number;
  nextPageToken?: string;
  code?: number;
  message?: string;
};

const API_BASE = "https://api.imdbapi.dev";
const CACHE_KEY = "binaire_titles_cache";
const USER_KEY = "binaire_local_user";
const WATCHLIST_KEY = "binaire_watchlist";
const HISTORY_KEY = "binaire_history";
const TARGET_LIBRARY_SIZE = 10000;
const PAGE_LIMIT = 50;
const INITIAL_VISIBLE = 36;
const REQUEST_COOLDOWN_MS = 60000;
const POSTER_FALLBACK =
  "linear-gradient(145deg, #2a0a0d 0%, #111 50%, #7a0f16 100%)";

function compactTitles(items: MovieTitle[]) {
  const byId = new Map<string, MovieTitle>();

  for (const item of items) {
    if (item.id && item.primaryTitle && !item.isAdult) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values());
}

function saveList(key: string, ids: string[]) {
  localStorage.setItem(key, JSON.stringify(ids.slice(0, 120)));
}

function readList(key: string) {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function readSavedUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? (JSON.parse(savedUser) as LocalUser) : null;
  } catch {
    return null;
  }
}

function readCachedTitles() {
  if (typeof window === "undefined") {
    return { titles: [], nextPageToken: undefined, lastUpdated: "" };
  }

  try {
    const payload = JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as {
      titles?: MovieTitle[];
      nextPageToken?: string;
      lastUpdated?: string;
    };

    return {
      titles: compactTitles(payload.titles || []),
      nextPageToken: payload.nextPageToken,
      lastUpdated: payload.lastUpdated || "",
    };
  } catch {
    return { titles: [], nextPageToken: undefined, lastUpdated: "" };
  }
}

function readOnlineStatus() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

async function fetchTitles(pageToken?: string, signal?: AbortSignal) {
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

  if (!response.ok) {
    throw new Error(`Unable to load titles:${response.status}`);
  }

  const payload = (await response.json()) as TitlesResponse;

  if (payload.code === 13 || payload.message?.toLowerCase().includes("too many network requests")) {
    throw new Error("Unable to load titles:429");
  }

  return payload;
}

async function searchRemote(query: string, signal?: AbortSignal) {
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

export default function Home() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<LocalUser | null>(null);
  const [authReady] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [authError, setAuthError] = useState("");
  const [titles, setTitles] = useState<MovieTitle[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [activeView, setActiveView] = useState<View>("home");
  const [selected, setSelected] = useState<MovieTitle | null>(null);
  const [query, setQuery] = useState("");
  const [remoteMatches, setRemoteMatches] = useState<MovieTitle[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiNotice, setApiNotice] = useState("");
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const titlesRef = useRef<MovieTitle[]>(titles);
  const nextPageTokenRef = useRef<string | undefined>(nextPageToken);
  const cooldownUntilRef = useRef(0);

  const signedIn = Boolean(firebaseUser || localUser);
  const userEmail = firebaseUser?.email || localUser?.email || "";
  const userName = localUser?.name || firebaseUser?.displayName || userEmail.split("@")[0];

  const updateConnectionState = useCallback((online: boolean) => {
    setIsOnline(online);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cached = readCachedTitles();

      setLocalUser(readSavedUser());
      setTitles(cached.titles);
      setNextPageToken(cached.nextPageToken);
      setLastUpdated(cached.lastUpdated);
      setLoadState(cached.titles.length ? "ready" : "idle");
      setWatchlist(readList(WATCHLIST_KEY));
      setHistory(readList(HISTORY_KEY));
      setIsOnline(readOnlineStatus());
      setHasHydrated(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const refreshTitles = useCallback(async (forceFirstPage = false) => {
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
      const merged = compactTitles([...currentTitles, ...(payload.titles || [])]);
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
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          titles: merged.slice(0, TARGET_LIBRARY_SIZE),
          nextPageToken: payload.nextPageToken,
          lastUpdated: updatedAt,
        }),
      );
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        const message = (error as Error).message;
        const isNetworkFailure =
          !navigator.onLine ||
          message.includes("Failed to fetch") ||
          message.includes("NetworkError") ||
          message.includes("load titles");

        if (message.endsWith(":429")) {
          cooldownUntilRef.current = Date.now() + REQUEST_COOLDOWN_MS;
          setApiNotice("IMDb is rate limiting requests. Showing cached titles for now.");
        } else if (isNetworkFailure) {
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
  }, [updateConnectionState]);

  useEffect(() => {
    if (!hasHydrated || !signedIn) {
      return;
    }

    if (titles.length === 0 && loadState !== "loading" && loadState !== "error" && !abortRef.current) {
      void refreshTitles(true);
    }
  }, [hasHydrated, signedIn, titles.length, loadState, refreshTitles]);

  const loadMoreTitles = useCallback(() => {
    if (isRefreshing || abortRef.current) {
      return;
    }

    if (titlesRef.current.length === 0) {
      void refreshTitles(true);
      return;
    }

    if (!nextPageTokenRef.current) {
      return;
    }

    setVisibleCount((count) => Math.min(count + 24, titlesRef.current.length + 24));
    void refreshTitles();
  }, [isRefreshing, refreshTitles]);

  useEffect(() => {
    titlesRef.current = titles;
  }, [titles]);

  useEffect(() => {
    nextPageTokenRef.current = nextPageToken;
  }, [nextPageToken]);

  useEffect(() => {
    const auth = getFirebaseAuth();

    if (!auth) {
      return;
    }

    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
  }, []);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreTitles();
      }
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMoreTitles, signedIn]);

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
      } catch {
        updateConnectionState(false);
      }
    }, 260);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query, updateConnectionState]);

  const titleById = useMemo(() => {
    const map = new Map<string, MovieTitle>();
    for (const title of titles) {
      map.set(title.id, title);
    }
    return map;
  }, [titles]);

  const searchIndex = useMemo(() => {
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
  }, [titles]);

  const todayTop = useMemo(() => {
    return (
      titles.find((title) => title.primaryImage?.url && title.plot) ||
      titles.find((title) => title.primaryImage?.url) ||
      titles[0]
    );
  }, [titles]);

  const searchResults = useMemo(() => {
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

    return compactTitles([...tokenMatches, ...directMatches, ...remoteMatches]).slice(0, 80);
  }, [query, searchIndex, titles, remoteMatches]);

  const suggestions = searchResults.slice(0, 6);
  const visibleTitles = titles.slice(0, visibleCount);
  const continueWatching = history.map((id) => titleById.get(id)).filter(Boolean) as MovieTitle[];
  const savedTitles = watchlist.map((id) => titleById.get(id)).filter(Boolean) as MovieTitle[];
  const isRetryState = loadState === "error" && titles.length === 0;
  const shouldShowLoadButton = Boolean(nextPageToken || isRetryState);
  const buttonLabel = isRetryState ? "Try again" : titles.length ? (nextPageToken ? "Load more" : "Library ready") : "Load library";
  const buttonDisabled = isRefreshing || (!isOnline && !isRetryState) || (!shouldShowLoadButton && titles.length > 0);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    if (!email || !password || (authMode === "signup" && !name)) {
      setAuthError("Complete the highlighted fields to continue.");
      return;
    }

    const auth = getFirebaseAuth();

    try {
      if (auth) {
        if (authMode === "signup") {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      }

      const nextUser = { email, name: name || email.split("@")[0] };
      setLocalUser(nextUser);
      localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    } catch (error) {
      const message = (error as Error).message;
      if (message.includes("CONFIGURATION_NOT_FOUND")) {
        setAuthError("Enable Email/Password sign-in in Firebase Authentication, then restart the dev server.");
      } else {
        setAuthError(message.replace("Firebase: ", ""));
      }
    }
  }

  function openTitle(title: MovieTitle) {
    setSelected(title);
    const nextHistory = [title.id, ...history.filter((id) => id !== title.id)];
    setHistory(nextHistory);
    saveList(HISTORY_KEY, nextHistory);
  }

  function toggleWatchlist(id: string) {
    const nextWatchlist = watchlist.includes(id)
      ? watchlist.filter((item) => item !== id)
      : [id, ...watchlist];

    setWatchlist(nextWatchlist);
    saveList(WATCHLIST_KEY, nextWatchlist);
  }

  async function handleSignOut() {
    const auth = getFirebaseAuth();
    if (auth) {
      await signOut(auth);
    }
    localStorage.removeItem(USER_KEY);
    setLocalUser(null);
    setFirebaseUser(null);
  }

  if (!hasHydrated || !authReady) {
    return <div className="boot-screen">Loading Streamline</div>;
  }

  if (!signedIn) {
    return (
      <AuthScreen
        authMode={authMode}
        authError={authError}
        onSubmit={handleAuth}
        onModeToggle={() => setAuthMode(authMode === "signup" ? "signin" : "signup")}
      />
    );
  }

  return (
    <main className="app-shell">
      <Sidebar activeView={activeView} isOnline={isOnline} onViewChange={setActiveView} />

      <section className="content">
        <header className="topbar">
          <div>
            <span className="eyebrow">Desktop media storefront</span>
            <h2>{activeView === "home" ? "Home" : activeView === "search" ? "Search" : "Profile"}</h2>
          </div>
          <div className="sync-note">
            {isRefreshing ? "Syncing..." : lastUpdated ? `Updated ${lastUpdated}` : "Preparing library"}
          </div>
        </header>

        {activeView === "home" && (
          <>
            {todayTop && (
              <section className="hero" style={{ backgroundImage: todayTop.primaryImage?.url ? `linear-gradient(90deg, #050505 0%, rgba(5,5,5,.78) 36%, rgba(5,5,5,.18) 100%), url(${todayTop.primaryImage.url})` : POSTER_FALLBACK }}>
                <div className="hero-copy">
                  <span className="eyebrow">Today&apos;s top show</span>
                  <h1>{todayTop.primaryTitle}</h1>
                  <p>{todayTop.plot || `${displayType(todayTop.type)} from ${todayTop.startYear || "the featured library"}.`}</p>
                  <div className="meta-row">
                    <span>{todayTop.startYear || "Fresh pick"}</span>
                    <span>{runtimeLabel(todayTop.runtimeSeconds)}</span>
                    <span>{todayTop.genres?.slice(0, 2).join(" / ") || "Featured"}</span>
                  </div>
                  <div className="action-row">
                    <button onClick={() => openTitle(todayTop)}>Play</button>
                    <button className="secondary" onClick={() => toggleWatchlist(todayTop.id)}>
                      {watchlist.includes(todayTop.id) ? "Saved" : "Watchlist"}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {continueWatching.length > 0 && (
              <TitleRail title="Continue watching" titles={continueWatching} onOpen={openTitle} watchlist={watchlist} onToggle={toggleWatchlist} />
            )}

            <section className="library-head">
              <div>
                <h3>Complete library</h3>
                <p>{titles.length.toLocaleString()} titles cached toward 10,000</p>
              </div>
              <button onClick={() => loadMoreTitles()} disabled={buttonDisabled}>
                {buttonLabel}
              </button>
            </section>
            {apiNotice && <div className="api-notice">{apiNotice}</div>}

            <section className="title-grid">
              {visibleTitles.map((title) => (
                <TitleCard key={title.id} title={title} saved={watchlist.includes(title.id)} onOpen={openTitle} onToggle={toggleWatchlist} />
              ))}
            </section>
            <div ref={sentinelRef} className="sentinel">
              {loadState === "loading" ? "Loading titles..." : nextPageToken ? "Scroll for more" : "Library ready"}
            </div>
            {loadState === "error" && <div className="empty-state">Could not load from the API. Cached titles will appear here once available.</div>}
          </>
        )}

        {activeView === "search" && (
          <section className="search-view">
            <div className="search-box">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by ID, name, release year, or genre"
                autoFocus
              />
              {suggestions.length > 0 && (
                <div className="suggestions">
                  {suggestions.map((title) => (
                    <button key={title.id} onClick={() => openTitle(title)}>
                      <span>{title.primaryTitle}</span>
                      <small>{title.id} · {title.startYear || "N/A"}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <section className="title-grid search-results">
              {searchResults.map((title) => (
                <TitleCard key={title.id} title={title} saved={watchlist.includes(title.id)} onOpen={openTitle} onToggle={toggleWatchlist} />
              ))}
            </section>
            {query && searchResults.length === 0 && <div className="empty-state">No matches found in the current index.</div>}
          </section>
        )}

        {activeView === "profile" && (
          <section className="profile-view">
            <div className="profile-card">
              <div className="avatar">{userName?.[0]?.toUpperCase() || "S"}</div>
              <div>
                <h3>{userName}</h3>
                <p>{userEmail}</p>
              </div>
              <button onClick={handleSignOut}>Sign out</button>
            </div>

            <TitleRail title="Watchlist" titles={savedTitles} onOpen={openTitle} watchlist={watchlist} onToggle={toggleWatchlist} />
            <TitleRail title="Watch history" titles={continueWatching} onOpen={openTitle} watchlist={watchlist} onToggle={toggleWatchlist} />
          </section>
        )}
      </section>

      {selected && (
        <DetailModal
          selected={selected}
          watchlist={watchlist}
          onClose={() => setSelected(null)}
          onToggleWatchlist={toggleWatchlist}
          posterFallback={POSTER_FALLBACK}
        />
      )}
    </main>
  );
}

