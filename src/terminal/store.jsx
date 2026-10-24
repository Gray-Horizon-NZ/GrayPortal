"use client";
// Drop-in for the terminal concept's store (OS/GrayPortal/terminal-concepts/grayportal-terminal-concept/
// src/store.jsx): screens keep calling useStore() and get the same shape —
// prefs + setPref, and collections with setX((prev) => next) setters — but
// the collections are real data seeded by the server, and every setter
// change is persisted through PERSIST (server actions) before the page
// re-renders from the server.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { PERSIST } from "./persist";
import { DEFAULT_PREFS, PREFS_COOKIE } from "./prefs";

const PrefsCtx = createContext({ prefs: DEFAULT_PREFS, setPref: () => {} });
const DataCtx = createContext({ state: {}, setters: {} });

export function PrefsProvider({ initial, children }) {
  const [prefs, setPrefs] = useState(() => ({ ...DEFAULT_PREFS, ...initial }));
  const setPref = useCallback((k, v) => {
    setPrefs((p) => {
      const next = { ...p, [k]: v };
      // A cookie (not localStorage) so the server renders the right theme
      // and blur state on the next request — no flash of the wrong theme.
      document.cookie = `${PREFS_COOKIE}=${encodeURIComponent(JSON.stringify(next))}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }, []);
  const value = useMemo(() => ({ prefs, setPref }), [prefs, setPref]);
  return <PrefsCtx.Provider value={value}>{children}</PrefsCtx.Provider>;
}

const cap = (s) => s[0].toUpperCase() + s.slice(1);

/**
 * Seeds collections for the screens below it. Nested providers merge, so
 * the shell's collections (inquiries, notifications) and a page's
 * (clients, tasks, …) are all reachable from useStore().
 */
export function StoreData({ data, children }) {
  const parent = useContext(DataCtx);
  const [state, setState] = useState(data);
  const [seed, setSeed] = useState(data);
  // Fresh server data (after a save or navigation) replaces local state.
  if (seed !== data) {
    setSeed(data);
    setState(data);
  }
  const current = useRef(state);
  useEffect(() => {
    current.current = state;
  }, [state]);

  // One stable updater; the ref is only read here, at event time.
  const update = useCallback((name, updater) => {
    const before = current.current[name];
    const after = typeof updater === "function" ? updater(before) : updater;
    current.current = { ...current.current, [name]: after };
    setState(current.current);
    const persist = PERSIST[name];
    if (persist) {
      Promise.resolve(persist(before, after)).catch((err) => {
        console.error(`[terminal] couldn't save ${name}`, err);
        window.alert(`Couldn't save that change — ${err?.message || "please try again"}.`);
      });
    }
  }, []);

  const keys = Object.keys(data).join("|");
  const setters = useMemo(() => {
    const names = keys.split("|").filter(Boolean);
    const out = {};
    for (const name of names) out[`set${cap(name)}`] = (updater) => update(name, updater);
    // The concept's brand editor (logo + tint on a client's banner).
    if (names.includes("clients")) {
      out.setBrand = (id, patch) => update("clients", (cs) => cs.map((c) => (c.id === id ? { ...c, brand: { ...c.brand, ...patch } } : c)));
    }
    return out;
  }, [keys, update]);

  const value = useMemo(
    () => ({ state: { ...parent.state, ...state }, setters: { ...parent.setters, ...setters } }),
    [parent, state, setters],
  );
  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useStore() {
  const { prefs, setPref } = useContext(PrefsCtx);
  const { state, setters } = useContext(DataCtx);
  return { prefs, setPref, ...state, ...setters };
}
