import { useState } from "react";
import { displayType } from "../lib/media";
import type { MovieTitle } from "../types";

type TitleCardProps = {
  title: MovieTitle;
  saved: boolean;
  compact?: boolean;
  onOpen: (title: MovieTitle) => void;
  onToggle: (id: string) => void;
};

export function TitleCard({ title, saved, compact = false, onOpen, onToggle }: TitleCardProps) {
  const posterUrl = title.primaryImage?.url;
  const hasValidPoster = Boolean(posterUrl && /^https?:\/\//i.test(posterUrl));
  const [imageFailed, setImageFailed] = useState(false);
  const fallbackLabel = title.primaryTitle.slice(0, 2).toUpperCase() || "TV";

  return (
    <article className={`title-card ${compact ? "compact" : ""}`}>
      <button className="poster-button" onClick={() => onOpen(title)}>
        {hasValidPoster && !imageFailed ? (
          <img src={posterUrl} alt={title.primaryTitle} loading="lazy" onError={() => setImageFailed(true)} />
        ) : (
          <div className="poster-fallback">{fallbackLabel}</div>
        )}
      </button>
      <div className="card-copy">
        <button onClick={() => onOpen(title)}>{title.primaryTitle}</button>
        <span>
          {title.startYear || "N/A"} · {displayType(title.type)}
        </span>
      </div>
      <button className={`save-button ${saved ? "saved" : ""}`} onClick={() => onToggle(title.id)}>
        {saved ? "✓" : "+"}
      </button>
    </article>
  );
}
