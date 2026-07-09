import type { MovieTitle } from "../types";

export function compactTitles(items: MovieTitle[]) {
  const byId = new Map<string, MovieTitle>();

  for (const item of items) {
    if (item.id && item.primaryTitle && !item.isAdult) {
      byId.set(item.id, item);
    }
  }

  return Array.from(byId.values());
}

export function mergeTitles(current: MovieTitle[], incoming: MovieTitle[]) {
  return compactTitles([...current, ...incoming]);
}

export function pickTodaysTop(titles: MovieTitle[], date = new Date()): MovieTitle | undefined {
  const eligible = titles.filter((title) => title.primaryImage?.url);
  if (!eligible.length) {
    return titles[0];
  }

  const daySeed = date.getFullYear() * 1000 + date.getMonth() * 31 + date.getDate();
  return eligible[daySeed % eligible.length];
}

export function buildTitleById(titles: MovieTitle[]) {
  const map = new Map<string, MovieTitle>();
  for (const title of titles) {
    map.set(title.id, title);
  }
  return map;
}

export function resolveTitles(ids: string[], titleById: Map<string, MovieTitle>) {
  return ids.map((id) => titleById.get(id)).filter(Boolean) as MovieTitle[];
}
