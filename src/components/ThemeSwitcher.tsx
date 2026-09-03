"use client";

import { useEffect, useRef, useState } from "react";
import {
  DARK_THEMES,
  DEFAULT_CHOICE,
  SYSTEM_DARK,
  SYSTEM_LIGHT,
  THEMES,
  THEME_STORAGE_KEY,
} from "@/lib/themes";

type Choice = "system" | string;

function systemTheme(): string {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? SYSTEM_DARK
    : SYSTEM_LIGHT;
}

function applyTheme(choice: Choice) {
  const resolved = choice === "system" ? systemTheme() : choice;
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = DARK_THEMES.has(resolved)
    ? "dark"
    : "light";
}

export function ThemeSwitcher() {
  const [choice, setChoice] = useState<Choice>(DEFAULT_CHOICE);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // The pre-paint script already applied the theme; adopt whatever it chose.
  useEffect(() => {
    try {
      setChoice(localStorage.getItem(THEME_STORAGE_KEY) ?? DEFAULT_CHOICE);
    } catch {
      setChoice(DEFAULT_CHOICE);
    }
  }, []);

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (choice !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => applyTheme("system");
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [choice]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pick = (next: Choice) => {
    setChoice(next);
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing or blocked storage — the theme still applies for now.
    }
    setOpen(false);
  };

  const current = THEMES.find((t) => t.id === choice);
  const label = choice === "system" ? "System" : (current?.label ?? "Theme");

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        className="btn btn-sm gap-2"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Swatch theme={current} />
        {label}
      </button>

      {open && (
        <div
          role="menu"
          className="card absolute right-0 z-50 mt-1.5 w-[268px] p-2 shadow-lg"
        >
          <SystemRow selected={choice === "system"} onClick={() => pick("system")} />
          {(["light", "dark"] as const).map((mode) => (
            <div key={mode}>
              <p className="eyebrow px-1 pb-1 pt-2">{mode}</p>
              <div className="grid grid-cols-2 gap-1">
                {THEMES.filter((theme) => theme.mode === mode).map((theme) => (
                  <Tile
                    key={theme.id}
                    theme={theme}
                    selected={choice === theme.id}
                    onClick={() => pick(theme.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SystemRow({
  selected,
  onClick,
}: {
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      className={`flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-surface-2 ${
        selected ? "bg-surface-2" : ""
      }`}
    >
      <Swatch theme={undefined} />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium">System</span>
        <span className="block truncate text-[11.5px] muted">
          Follow the OS setting
        </span>
      </span>
      {selected && <Tick />}
    </button>
  );
}

function Tile({
  theme,
  selected,
  onClick,
}: {
  theme: (typeof THEMES)[number];
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={selected}
      onClick={onClick}
      title={theme.label}
      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-left text-[12.5px] transition-colors ${
        selected
          ? "border-accent bg-accent-soft font-medium text-accent"
          : "border-transparent hover:bg-surface-2"
      }`}
    >
      <Swatch theme={theme} />
      <span className="min-w-0 flex-1 truncate">{theme.label}</span>
    </button>
  );
}

function Tick() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="m3 8.5 3.2 3.2L13 5"
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Canvas, surface and accent stacked into one small chip. */
function Swatch({ theme }: { theme: (typeof THEMES)[number] | undefined }) {
  if (!theme) {
    return (
      <span
        aria-hidden="true"
        className="h-4 w-4 flex-none rounded-full border border-line"
        style={{
          background:
            "linear-gradient(135deg, #ffffff 0 50%, #14161a 50% 100%)",
        }}
      />
    );
  }
  const [canvas, surface, accent] = theme.swatch;
  return (
    <span
      aria-hidden="true"
      className="relative h-4 w-4 flex-none overflow-hidden rounded-full border border-line"
      style={{ background: canvas }}
    >
      <span
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ background: surface }}
      />
      <span
        className="absolute left-1/2 top-1/2 h-[7px] w-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: accent }}
      />
    </span>
  );
}
