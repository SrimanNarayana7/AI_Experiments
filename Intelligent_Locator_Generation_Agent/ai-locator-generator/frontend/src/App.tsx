import { useEffect, useState } from "react";
import { AppShell } from "./components/layout/AppShell";
import { TopNav } from "./components/layout/TopNav";
import { LocatorGenerator } from "./pages/LocatorGenerator";
import { checkHealth } from "./services/api";
import type { Framework, Language } from "./types/locator";

export default function App() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [framework, setFramework] = useState<Framework>("playwright");
  const [language, setLanguage] = useState<Language>("typescript");
  const [backend, setBackend] = useState<{ ok: boolean; provider: string }>({ ok: false, provider: "unknown" });

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
  }, [theme]);

  useEffect(() => {
    checkHealth().then(setBackend);
  }, []);

  return (
    <AppShell>
      <TopNav
        backend={backend}
        framework={framework}
        language={language}
        theme={theme}
        onFrameworkChange={setFramework}
        onLanguageChange={setLanguage}
        onToggleTheme={() => setTheme(theme === "dark" ? "light" : "dark")}
      />
      <LocatorGenerator
        framework={framework}
        language={language}
        onFrameworkChange={setFramework}
        onLanguageChange={setLanguage}
      />
    </AppShell>
  );
}
