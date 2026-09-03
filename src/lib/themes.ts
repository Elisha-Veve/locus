export interface ThemeOption {
  id: string;
  label: string;
  mode: "light" | "dark";
  /** Three swatches shown in the picker: canvas, surface, accent. */
  swatch: [string, string, string];
}

/**
 * Palettes come in pairs — one light key and one dark key per hue — so every
 * colour is available whichever way you work. "system" is not in this list; it
 * is offered separately and resolves to light or dark from the OS preference.
 */
export const THEMES: ThemeOption[] = [
  // Neutral
  { id: "light", label: "Light", mode: "light", swatch: ["#f4f5f7", "#ffffff", "#1d4ed8"] },
  { id: "dark", label: "Dark", mode: "dark", swatch: ["#0f1115", "#171a20", "#6f97ff"] },
  // Green
  { id: "sage", label: "Sage", mode: "light", swatch: ["#f1f4f0", "#ffffff", "#2f7d5a"] },
  { id: "forest", label: "Forest", mode: "dark", swatch: ["#0d1310", "#141c17", "#5fd39a"] },
  // Amber
  { id: "parchment", label: "Parchment", mode: "light", swatch: ["#f5f1e8", "#fffdf7", "#9a5b1f"] },
  { id: "ember", label: "Ember", mode: "dark", swatch: ["#14100b", "#1c1711", "#e0973f"] },
  // Blue
  { id: "harbor", label: "Harbor", mode: "light", swatch: ["#eff3f8", "#ffffff", "#1668b8"] },
  { id: "midnight", label: "Midnight", mode: "dark", swatch: ["#0b111c", "#121a28", "#57a8f5"] },
  // Violet
  { id: "iris", label: "Iris", mode: "light", swatch: ["#f4f1fa", "#ffffff", "#6d3fc4"] },
  { id: "plum", label: "Plum", mode: "dark", swatch: ["#120e1a", "#1a1526", "#a982f5"] },
  // Rose
  { id: "blush", label: "Blush", mode: "light", swatch: ["#fbf0f5", "#ffffff", "#b52a72"] },
  { id: "garnet", label: "Garnet", mode: "dark", swatch: ["#170d13", "#20141c", "#ec6fa8"] },
];

export const DEFAULT_THEME = "light";
export const THEME_STORAGE_KEY = "locus.theme";

/** Themes that ask the browser for dark native controls and scrollbars. */
export const DARK_THEMES = new Set(
  THEMES.filter((t) => t.mode === "dark").map((t) => t.id),
);
