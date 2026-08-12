export const THEME_COOKIE = "theme";

export function parseTheme(value) {
  return value === "light" || value === "dark" ? value : undefined;
}
