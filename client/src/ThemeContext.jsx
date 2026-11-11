import { createContext, useContext, useState } from "react";
import { themes } from "./theme";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [mode, setMode] = useState("light");
  const theme = themes[mode];
  const toggle = () => setMode(m => m === "light" ? "dark" : "light");
  return (
    <ThemeContext.Provider value={{ theme, mode, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);