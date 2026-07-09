import {
  CACHE_KEY,
  HISTORY_KEY_PREFIX,
  MAX_USER_LIST_SIZE,
  TARGET_LIBRARY_SIZE,
  WATCHLIST_KEY_PREFIX,
} from "./constants";
import { compactTitles } from "./titles";
import type { MovieTitle } from "../types";

export type TitlesCache = {
  titles: MovieTitle[];
  nextPageToken?: string;
  lastUpdated: string;
};

export function readOnlineStatus() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export function userListKey(prefix: string, uid: string) {
  return `${prefix}:${uid}`;
}

export function readCachedTitles(): TitlesCache {
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

export function writeCachedTitles(
  titles: MovieTitle[],
  nextPageToken: string | undefined,
  lastUpdated: string,
) {
  if (typeof window === "undefined") {
    return;
  }

  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({
      titles: titles.slice(0, TARGET_LIBRARY_SIZE),
      nextPageToken,
      lastUpdated,
    }),
  );
}

export function readUserList(uid: string, prefix: string) {
  if (typeof window === "undefined" || !uid) {
    return [];
  }

  const key = userListKey(prefix, uid);

  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function writeUserList(uid: string, prefix: string, ids: string[]) {
  if (typeof window === "undefined" || !uid) {
    return;
  }

  const key = userListKey(prefix, uid);
  localStorage.setItem(key, JSON.stringify(ids.slice(0, MAX_USER_LIST_SIZE)));
}

export function readWatchlist(uid: string) {
  return readUserList(uid, WATCHLIST_KEY_PREFIX);
}

export function writeWatchlist(uid: string, ids: string[]) {
  writeUserList(uid, WATCHLIST_KEY_PREFIX, ids);
}

export function readHistory(uid: string) {
  return readUserList(uid, HISTORY_KEY_PREFIX);
}

export function writeHistory(uid: string, ids: string[]) {
  writeUserList(uid, HISTORY_KEY_PREFIX, ids);
}
