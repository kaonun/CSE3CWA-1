export const THEME_COOKIE = "theme";

export function parseTheme(value) {
  return value === "light" || value === "dark" ? value : undefined;
}

export function getActiveTheme() {
  if (typeof document === "undefined" || typeof window === "undefined") {
    return "light";
  }

  const selectedTheme = parseTheme(document.documentElement.dataset.theme);
  if (selectedTheme) return selectedTheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}
