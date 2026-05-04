// input: DraftRecall local state and system color scheme; output: data-theme attribute side effect; pos: global theme bootstrap, update this header and components/README.md when changed.
"use client";

import { useEffect } from "react";
import { loadState } from "@/lib/storage";

function applyTheme() {
  const state = loadState();
  const theme = state.theme === "system"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
    : state.theme;
  document.documentElement.dataset.theme = theme;
}

export function ThemeProvider() {
  useEffect(() => {
    applyTheme();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", applyTheme);
    window.addEventListener("storage", applyTheme);
    window.addEventListener("draftrecall-theme", applyTheme);
    return () => {
      media.removeEventListener("change", applyTheme);
      window.removeEventListener("storage", applyTheme);
      window.removeEventListener("draftrecall-theme", applyTheme);
    };
  }, []);

  return null;
}
