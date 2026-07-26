import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { ThemeContext, type Theme } from "@/hooks/use-theme"; // Import from the new file

interface ThemeProviderProps {
  children: ReactNode;
  darkModeClass?: string;
  defaultTheme?: Theme;
  storageKey?: string;
}

export const ThemeProvider = ({
  children,
  defaultTheme = "system",
  storageKey = "ui-theme",
  darkModeClass = "dark-mode",
}: ThemeProviderProps) => {
  // BEST PRACTICE 1: SSR / Hydration Safety (See explanation below)
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  // BEST PRACTICE 2: Fix Exhaustive Deps warning
  useEffect(() => {
    // 1. Read from local storage on mount
    const savedTheme = localStorage.getItem(storageKey) as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // 2. Apply theme logic
    const applyTheme = (currentTheme: Theme) => {
      const root = window.document.documentElement;

      if (currentTheme === "system") {
        const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
          .matches
          ? "dark"
          : "light";
        root.classList.toggle(darkModeClass, systemTheme === "dark");
        localStorage.removeItem(storageKey);
      } else {
        root.classList.toggle(darkModeClass, currentTheme === "dark");
        localStorage.setItem(storageKey, currentTheme);
      }
    };

    // Apply initial theme (saved or default)
    applyTheme(savedTheme || defaultTheme);

    // 3. Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (theme === "system") {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme, storageKey, darkModeClass, defaultTheme]); // Added missing dependencies

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
