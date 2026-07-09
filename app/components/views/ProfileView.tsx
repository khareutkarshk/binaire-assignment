import { memo } from "react";
import { TitleRail } from "../TitleRail";
import type { MovieTitle } from "../../types";

type ProfileViewProps = {
  userName: string;
  userEmail: string;
  savedTitles: MovieTitle[];
  continueWatching: MovieTitle[];
  watchlist: Set<string>;
  onOpen: (title: MovieTitle) => void;
  onToggle: (id: string) => void;
  onSignOut: () => void;
};

export const ProfileView = memo(function ProfileView({
  userName,
  userEmail,
  savedTitles,
  continueWatching,
  watchlist,
  onOpen,
  onToggle,
  onSignOut,
}: ProfileViewProps) {
  return (
    <section className="profile-view view-panel">
      <div className="profile-card">
        <div className="avatar">{userName?.[0]?.toUpperCase() || "S"}</div>
        <div>
          <h3>{userName}</h3>
          <p>{userEmail}</p>
        </div>
        <button onClick={onSignOut}>Sign out</button>
      </div>

      {savedTitles.length > 0 ? (
        <TitleRail
          title="Watchlist"
          titles={savedTitles}
          watchlist={watchlist}
          onOpen={onOpen}
          onToggle={onToggle}
        />
      ) : (
        <div className="empty-state">Your watchlist is empty. Save titles from the home or search views.</div>
      )}

      {continueWatching.length > 0 ? (
        <TitleRail
          title="Watch history"
          titles={continueWatching}
          watchlist={watchlist}
          onOpen={onOpen}
          onToggle={onToggle}
        />
      ) : (
        <div className="empty-state">No watch history yet. Open a title to start tracking.</div>
      )}
    </section>
  );
});
