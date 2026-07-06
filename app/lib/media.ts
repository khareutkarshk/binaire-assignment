export function displayType(type: string) {
  return type
    .replace(/([A-Z])/g, " $1")
    .replace(/^tv/i, "TV")
    .trim();
}

export function runtimeLabel(seconds?: number) {
  if (!seconds) {
    return "Short form";
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
