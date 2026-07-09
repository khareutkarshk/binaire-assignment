import { memo } from "react";
import { displayType, runtimeLabel } from "../../lib/media";
import { POSTER_FALLBACK } from "../../lib/constants";
import { pickTodaysTop } from "../../lib/titles";
import { TitleCard } from "../TitleCard";
import { TitleRail } from "../TitleRail";
import type { MovieTitle } from "../../types";

type HomeViewProps = {
  titles: MovieTitle[];
  visibleTitles: MovieTitle[];
  continueWatching: MovieTitle[];
  watchlist: Set<string>;
  todayTop?: MovieTitle;
  loadState: "idle" | "loading" | "ready" | "error";
  nextPageToken?: string;
  isRefreshing: boolean;
  isOnline: boolean;
  apiNotice: string;
  shouldShowRetryButton: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
  onOpen: (title: MovieTitle) => void;
  onToggle: (id: string) => void;
  onRetry: () => void;
};

export const HomeView = memo(function HomeView({
  titles,
  visibleTitles,
  continueWatching,
  watchlist,
  todayTop: todayTopProp,
  loadState,
  nextPageToken,
  isRefreshing,
  isOnline,
  apiNotice,
  shouldShowRetryButton,
  sentinelRef,
  onOpen,
  onToggle,
  onRetry,
}: HomeViewProps) {
  const todayTop = todayTopProp ?? pickTodaysTop(titles);

  return (
    <div className="view-panel">
      {todayTop && (
        <section
          className="hero"
          style={{
            backgroundImage: todayTop.primaryImage?.url
              ? `linear-gradient(90deg, #050505 0%, rgba(5,5,5,.78) 36%, rgba(5,5,5,.18) 100%), url(${todayTop.primaryImage.url})`
              : POSTER_FALLBACK,
          }}
        >
          <div className="hero-copy">
            <span className="eyebrow">Today&apos;s top show</span>
            <h1>{todayTop.primaryTitle}</h1>
            <p>
              {todayTop.plot ||
                `${displayType(todayTop.type)} from ${todayTop.startYear || "the featured library"}.`}
            </p>
            <div className="meta-row">
              <span>{todayTop.startYear || "Fresh pick"}</span>
              <span>{runtimeLabel(todayTop.runtimeSeconds)}</span>
              <span>{todayTop.genres?.slice(0, 2).join(" / ") || "Featured"}</span>
            </div>
            <div className="action-row">
              <button onClick={() => onOpen(todayTop)}>Play</button>
              <button className="secondary" onClick={() => onToggle(todayTop.id)}>
                {watchlist.has(todayTop.id) ? "Saved" : "Watchlist"}
              </button>
            </div>
          </div>
        </section>
      )}

      {continueWatching.length > 0 && (
        <TitleRail
          title="Continue watching"
          titles={continueWatching}
          watchlist={watchlist}
          onOpen={onOpen}
          onToggle={onToggle}
        />
      )}

      <section className="library-head">
        <div>
          <h3>Complete library</h3>
          <p>{titles.length.toLocaleString()} titles cached toward 10,000</p>
        </div>
        {shouldShowRetryButton && (
          <button onClick={onRetry} disabled={isRefreshing || !isOnline}>
            Try again
          </button>
        )}
      </section>
      {apiNotice && <div className="api-notice">{apiNotice}</div>}

      <section className="title-grid">
        {visibleTitles.map((title) => (
          <TitleCard
            key={title.id}
            title={title}
            saved={watchlist.has(title.id)}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
      </section>
      <div ref={sentinelRef} className="sentinel">
        {loadState === "loading"
          ? "Loading titles..."
          : nextPageToken
            ? "Scroll for more"
            : "Library ready"}
      </div>
      {loadState === "error" && (
        <div className="empty-state">
          Could not load from the API. Cached titles will appear here once available.
        </div>
      )}
    </div>
  );
});
