import { memo } from "react";
import { TitleCard } from "../TitleCard";
import type { MovieTitle } from "../../types";

type SearchViewProps = {
  query: string;
  suggestions: MovieTitle[];
  searchResults: MovieTitle[];
  watchlist: Set<string>;
  isOfflineSearchOnly: boolean;
  onQueryChange: (value: string) => void;
  onOpen: (title: MovieTitle) => void;
  onToggle: (id: string) => void;
};

export const SearchView = memo(function SearchView({
  query,
  suggestions,
  searchResults,
  watchlist,
  isOfflineSearchOnly,
  onQueryChange,
  onOpen,
  onToggle,
}: SearchViewProps) {
  return (
    <section className="search-view view-panel">
      <div className="search-box">
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search by ID, name, release year, or genre"
          autoFocus
        />
        {isOfflineSearchOnly && (
          <div className="api-notice">Offline — searching cached titles only.</div>
        )}
        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((title) => (
              <button key={title.id} onClick={() => onOpen(title)}>
                <span>{title.primaryTitle}</span>
                <small>
                  {title.id} · {title.startYear || "N/A"}
                </small>
              </button>
            ))}
          </div>
        )}
      </div>
      <section className="title-grid search-results">
        {searchResults.map((title) => (
          <TitleCard
            key={title.id}
            title={title}
            saved={watchlist.has(title.id)}
            onOpen={onOpen}
            onToggle={onToggle}
          />
        ))}
      </section>
      {query && searchResults.length === 0 && (
        <div className="empty-state">No matches found in the current index.</div>
      )}
    </section>
  );
});
