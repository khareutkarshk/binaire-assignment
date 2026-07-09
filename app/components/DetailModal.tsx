import { memo } from "react";
import { displayType } from "../lib/media";
import type { MovieTitle } from "../types";

type DetailModalProps = {
  selected: MovieTitle;
  watchlist: Set<string>;
  onClose: () => void;
  onPlay: (title: MovieTitle) => void;
  onToggleWatchlist: (id: string) => void;
  posterFallback: string;
};

export const DetailModal = memo(function DetailModal({
  selected,
  watchlist,
  onClose,
  onPlay,
  onToggleWatchlist,
  posterFallback,
}: DetailModalProps) {
  return (
    <section className="detail-backdrop" onClick={onClose}>
      <article className="detail-modal" onClick={(event) => event.stopPropagation()}>
        <button className="close-button" onClick={onClose}>
          ×
        </button>
        <div
          className="detail-art"
          style={{
            backgroundImage: selected.primaryImage?.url
              ? `url(${selected.primaryImage.url})`
              : posterFallback,
          }}
        />
        <div className="detail-copy">
          <span className="eyebrow">{selected.id}</span>
          <h2>{selected.primaryTitle}</h2>
          <div className="meta-row">
            <span>{selected.startYear || "Unknown year"}</span>
            <span>{displayType(selected.type)}</span>
            <span>
              {selected.rating?.aggregateRating
                ? `${selected.rating.aggregateRating.toFixed(1)} rating`
                : "New"}
            </span>
          </div>
          <p>
            {selected.plot ||
              "No synopsis is available yet. Add it to your list and keep browsing the catalogue."}
          </p>
          <div className="action-row">
            <button onClick={() => onPlay(selected)}>Play preview</button>
            <button className="secondary" onClick={() => onToggleWatchlist(selected.id)}>
              {watchlist.has(selected.id) ? "Remove from list" : "Add to list"}
            </button>
          </div>
        </div>
      </article>
    </section>
  );
});
