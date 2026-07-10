"use client";

/**
 * Theme context: tracks light/dark mode, persists the choice to localStorage,
 * and toggles the `dark` class on the document root. Includes a pre-hydration
 * init script to apply the stored theme without a flash of the wrong theme.
 */

import { createContext, useCallback, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextValue {
  theme: Theme;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const STORAGE_KEY = "slh_theme";

// Runs before hydration (injected in <head>) to set the class immediately and
// avoid a flash of the wrong theme. Stringified into a <script>.
export const themeInitScript = `
(function() {
  try {
    var t = localStorage.getItem('${STORAGE_KEY}');
    if (!t) t = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

// Provides theme state to the tree, syncing with the class the init script applied.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  // read the theme the init script already applied (deferred so the state update
  // doesn't run synchronously inside the effect body)
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    });
    return () => {
      active = false;
    };
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable — theme still applies for this session */
      }
      return next;
    });
  }, []);

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

// Hook to read the theme context; throws if used outside a ThemeProvider.
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
