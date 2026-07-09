export type TitleType = "movie" | "tvSeries" | "tvMiniSeries" | "tvMovie" | string;

export type MovieTitle = {
  id: string;
  type: TitleType;
  isAdult?: boolean;
  primaryTitle: string;
  originalTitle?: string;
  primaryImage?: {
    url: string;
    width?: number;
    height?: number;
  };
  startYear?: number;
  endYear?: number;
  runtimeSeconds?: number;
  genres?: string[];
  rating?: {
    aggregateRating?: number;
    voteCount?: number;
  };
  plot?: string;
};

export type View = "home" | "search" | "profile";