import * as React from "react";

type ThemeMode = "light" | "dark";

const THEME_STORAGE_KEY = "theme-mode";

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeModeContext = React.createContext<ThemeModeContextValue | undefined>(
  undefined,
);

const getInitialMode = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" ? "dark" : "light";
};

const applyDomTheme = (mode: ThemeMode) => {
  const root = document.documentElement;
  if (mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

const ThemeModeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = React.useState<ThemeMode>(() => {
    const initial = getInitialMode();
    applyDomTheme(initial);
    return initial;
  });

  const setMode = React.useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode);
    localStorage.setItem(THEME_STORAGE_KEY, nextMode);
    applyDomTheme(nextMode);
  }, []);

  React.useEffect(() => {
    applyDomTheme(mode);
  }, [mode]);

  const value = React.useMemo(
    () => ({
      mode,
      setMode,
    }),
    [mode, setMode],
  );

  return (
    <ThemeModeContext.Provider value={value}>{children}</ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const context = React.useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within ThemeModeProvider");
  }
  return context;
};

export default ThemeModeProvider;
export type { ThemeMode };
