"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthScreen } from "./components/AuthScreen";
import { DetailModal } from "./components/DetailModal";
import { FirebaseConfigScreen } from "./components/FirebaseConfigScreen";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import { Sidebar } from "./components/Sidebar";
import { HomeView } from "./components/views/HomeView";
import { ProfileView } from "./components/views/ProfileView";
import { SearchView } from "./components/views/SearchView";
import { useAuth } from "./hooks/useAuth";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { useSearch } from "./hooks/useSearch";
import { useTitles } from "./hooks/useTitles";
import { useUserLibrary } from "./hooks/useUserLibrary";
import { POSTER_FALLBACK } from "./lib/constants";
import { pickTodaysTop } from "./lib/titles";
import type { MovieTitle, View } from "./types";

export default function Home() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [activeView, setActiveView] = useState<View>("home");
  const [selected, setSelected] = useState<MovieTitle | null>(null);
  const reconnectRef = useRef<() => void>(() => {});

  const {
    firebaseConfigured,
    authReady,
    authMode,
    authError,
    signedIn,
    userEmail,
    userName,
    uid,
    handleAuth,
    handleSignOut,
    toggleAuthMode,
  } = useAuth();

  const { isOnline, updateConnectionState } = useOnlineStatus({
    onReconnect: () => reconnectRef.current(),
  });

  const {
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
    handleReconnect,
  } = useTitles({
    enabled: signedIn,
    hasHydrated,
    updateConnectionState,
  });

  useEffect(() => {
    reconnectRef.current = handleReconnect;
  }, [handleReconnect]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setHasHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const { watchlist, continueWatching, savedTitles, openTitle, toggleWatchlist } = useUserLibrary({
    uid,
    titles,
  });

  const { query, setQuery, searchResults, suggestions } = useSearch({
    titles,
    updateConnectionState,
  });

  const todayTop = useMemo(() => pickTodaysTop(titles), [titles]);

  const handleOpenTitle = useCallback(
    (title: MovieTitle) => {
      openTitle(title);
      setSelected(title);
    },
    [openTitle],
  );

  const handleSignOutAndReset = useCallback(async () => {
    await handleSignOut();
    setActiveView("home");
    setSelected(null);
  }, [handleSignOut]);

  const viewLabel = activeView === "home" ? "Home" : activeView === "search" ? "Search" : "Profile";

  if (!hasHydrated || !authReady) {
    return <div className="boot-screen">Loading Streamline</div>;
  }

  if (!firebaseConfigured) {
    return (
      <>
        <ServiceWorkerRegister />
        <FirebaseConfigScreen />
      </>
    );
  }

  if (!signedIn) {
    return (
      <>
        <ServiceWorkerRegister />
        <AuthScreen
          authMode={authMode}
          authError={authError}
          onSubmit={handleAuth}
          onModeToggle={toggleAuthMode}
        />
      </>
    );
  }

  return (
    <>
      <ServiceWorkerRegister />
      <main className="app-shell">
        <Sidebar activeView={activeView} isOnline={isOnline} onViewChange={setActiveView} />

        <section className="content">
          <header className="topbar">
            <div>
              <span className="eyebrow">Desktop media storefront</span>
              <h2>{viewLabel}</h2>
            </div>
            <div className="sync-note">
              {isRefreshing
                ? "Syncing..."
                : lastUpdated
                  ? `Updated ${lastUpdated}`
                  : "Preparing library"}
            </div>
          </header>

          {activeView === "home" && (
            <HomeView
              titles={titles}
              visibleTitles={visibleTitles}
              continueWatching={continueWatching}
              watchlist={watchlist}
              todayTop={todayTop}
              loadState={loadState}
              nextPageToken={nextPageToken}
              isRefreshing={isRefreshing}
              isOnline={isOnline}
              apiNotice={apiNotice}
              shouldShowRetryButton={shouldShowRetryButton}
              sentinelRef={sentinelRef}
              onOpen={handleOpenTitle}
              onToggle={toggleWatchlist}
              onRetry={() => refreshTitles(true)}
            />
          )}

          {activeView === "search" && (
            <SearchView
              query={query}
              suggestions={suggestions}
              searchResults={searchResults}
              watchlist={watchlist}
              isOfflineSearchOnly={!isOnline && Boolean(query.trim())}
              onQueryChange={setQuery}
              onOpen={handleOpenTitle}
              onToggle={toggleWatchlist}
            />
          )}

          {activeView === "profile" && (
            <ProfileView
              userName={userName}
              userEmail={userEmail}
              savedTitles={savedTitles}
              continueWatching={continueWatching}
              watchlist={watchlist}
              onOpen={handleOpenTitle}
              onToggle={toggleWatchlist}
              onSignOut={handleSignOutAndReset}
            />
          )}
        </section>

        {selected && (
          <DetailModal
            selected={selected}
            watchlist={watchlist}
            onClose={() => setSelected(null)}
            onPlay={handleOpenTitle}
            onToggleWatchlist={toggleWatchlist}
            posterFallback={POSTER_FALLBACK}
          />
        )}
      </main>
    </>
  );
}
