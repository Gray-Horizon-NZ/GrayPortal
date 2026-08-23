"use client";
import { useEffect, useState } from "react";
import { PORTAL_THEME_STORAGE_KEY } from "./themeScript";

type PortalTheme = "dark" | "light";

/** Segmented Dark/Light control — mirrors the mockup's Appearance widget. Persists to localStorage; the blocking init script (themeScript.ts) applies the stored value before paint on later loads. */
export default function ThemeToggle() {
  const [theme, setThemeState] = useState<PortalTheme>("dark");

  useEffect(() => {
    const root = document.querySelector(".ghp-root");
    const current = root?.getAttribute("data-portal-theme");
    // Syncing from an external system (the DOM attribute the blocking init
    // script — themeScript.ts — sets before paint), not from derivable
    // React state, so a direct setState here is the documented exception.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current === "light" || current === "dark") setThemeState(current);
  }, []);

  function setTheme(next: PortalTheme) {
    setThemeState(next);
    document.querySelector(".ghp-root")?.setAttribute("data-portal-theme", next);
    try {
      localStorage.setItem(PORTAL_THEME_STORAGE_KEY, next);
    } catch {
      // private browsing / storage disabled — theme just won't persist
    }
  }

  return (
    <div className="ghp-theme-toggle">
      <button type="button" className={theme === "dark" ? "ghp-active" : ""} onClick={() => setTheme("dark")}>
        Dark
      </button>
      <button type="button" className={theme === "light" ? "ghp-active" : ""} onClick={() => setTheme("light")}>
        Light
      </button>
    </div>
  );
}
