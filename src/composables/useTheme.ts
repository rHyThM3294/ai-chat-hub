import { ref, watch } from "vue";

export type Theme = "light" | "dark";

const STORAGE_KEY = "ai-chat-hub-theme";

function getSystemPreference(): Theme {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
  if (stored === "light" || stored === "dark") return stored;
  return getSystemPreference();
}

function applyTheme(value: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", value);
}

const theme = ref<Theme>(getInitialTheme());
applyTheme(theme.value);

watch(theme, (value) => {
  applyTheme(value);
  localStorage.setItem(STORAGE_KEY, value);
});

export function useTheme() {
  function toggleTheme() {
    theme.value = theme.value === "dark" ? "light" : "dark";
  }
  return { theme, toggleTheme };
}
