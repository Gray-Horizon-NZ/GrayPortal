// Shared by the server layout (reads the cookie) and the client store
// (writes it) — a plain module, so both sides import the same values.
export const PREFS_COOKIE = "gh_term_prefs";
export const DEFAULT_PREFS = {
  theme: "dark", // "dark" | "light"
  privacy: false, // blur private numbers/information
  clientView: "grid", // "grid" | "list"
  minimalClientCards: false, // hide the banner art on client cards
  density: "comfortable", // "comfortable" | "compact"
  openFolders: [], // rail folders the viewer has opened
};
