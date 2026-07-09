import { memo } from "react";
import type { MovieTitle } from "../types";
import { TitleCard } from "./TitleCard";

type TitleRailProps = {
  title: string;
  titles: MovieTitle[];
  watchlist: Set<string>;
  onOpen: (title: MovieTitle) => void;
  onToggle: (id: string) => void;
};

export const TitleRail = memo(function TitleRail({
  title,
  titles,
  watchlist,
  onOpen,
  onToggle,
}: TitleRailProps) {
  if (!titles.length) {
    return null;
  }

  return (
    <section className="rail">
      <h3>{title}</h3>
      <div className="rail-strip">
        {titles.map((item) => (
          <TitleCard
            key={item.id}
            title={item}
            saved={watchlist.has(item.id)}
            onOpen={onOpen}
            onToggle={onToggle}
            compact
          />
        ))}
      </div>
    </section>
  );
});
