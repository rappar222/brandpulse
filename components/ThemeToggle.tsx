"use client";

import React, { useEffect, useState, useRef } from "react";
import { Palette, Check, Sparkles } from "lucide-react";

export interface ColorTheme {
  id: string;
  name: string;
  mood: string;
  icon: string;
  isDark: boolean;
  colors: {
    bg: string;
    card: string;
    accent: string;
  };
}

export const THEMES: ColorTheme[] = [
  {
    id: "midnight",
    name: "Midnight Stellar",
    mood: "Deep space obsidian & sapphire indigo",
    icon: "🌙",
    isDark: true,
    colors: { bg: "#090d16", card: "#0f172a", accent: "#6366f1" },
  },
  {
    id: "daylight",
    name: "Light",
    mood: "Crisp porcelain white with rich sapphire ink",
    icon: "☀️",
    isDark: false,
    colors: { bg: "#f8fafc", card: "#ffffff", accent: "#4f46e5" },
  },
  {
    id: "lavender",
    name: "Cozy Lavender",
    mood: "Twilight wisteria & soothing royal violet",
    icon: "☕",
    isDark: true,
    colors: { bg: "#100d1c", card: "#181329", accent: "#a855f7" },
  },
  {
    id: "rose",
    name: "Rosé Pine",
    mood: "Velvet bloom blush, warm wine & peach coral",
    icon: "🌸",
    isDark: true,
    colors: { bg: "#150f14", card: "#1f141f", accent: "#f43f5e" },
  },
  {
    id: "forest",
    name: "Matcha Sanctuary",
    mood: "Japanese matcha, bamboo & lush emerald sage",
    icon: "🌲",
    isDark: true,
    colors: { bg: "#09130f", card: "#101e18", accent: "#10b981" },
  },
  {
    id: "nord",
    name: "Nordic Frost",
    mood: "Polar fjord night, ice shelf & glacial cyan",
    icon: "❄️",
    isDark: true,
    colors: { bg: "#09121a", card: "#0f1b26", accent: "#06b6d4" },
  },
  {
    id: "cyber",
    name: "Tokyo Cyber",
    mood: "Neon synthwave, ultraviolet & electric fuchsia",
    icon: "⚡",
    isDark: true,
    colors: { bg: "#080210", card: "#120622", accent: "#ec4899" },
  },
];

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [activeThemeId, setActiveThemeId] = useState("midnight");
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("brandpulse_theme");
    const initialThemeId = stored || "midnight";
    applyTheme(initialThemeId);
  }, []);

  // Close popover on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const applyTheme = (themeId: string) => {
    const theme = THEMES.find((t) => t.id === themeId) || THEMES[0];
    setActiveThemeId(theme.id);
    localStorage.setItem("brandpulse_theme", theme.id);

    const root = document.documentElement;
    root.setAttribute("data-theme", theme.id);

    if (theme.isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  };

  const currentTheme = THEMES.find((t) => t.id === activeThemeId) || THEMES[0];

  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-xl border-2 border-slate-300 dark:border-slate-800" />
    );
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-indigo-400 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs group"
        title="Choose your theme"
        aria-label="Theme selector"
        aria-expanded={isOpen}
      >
        <span className="text-sm select-none">{currentTheme.icon}</span>

        {/* Color swatch dot */}
        <span
          className="w-2.5 h-2.5 rounded-full shadow-2xs border border-white/20"
          style={{ backgroundColor: currentTheme.colors.accent }}
        />

        <span className="text-xs font-bold hidden sm:inline-block">
          {currentTheme.name}
        </span>

        <Palette className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors ml-0.5" />
      </button>

      {/* Themes Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-88 rounded-3xl border-2 border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900/95 shadow-2xl p-3 z-50 animate-fadeIn backdrop-blur-md">
          <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200 dark:border-slate-800 mb-2">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider">
                Choose your theme
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              {THEMES.length} palettes
            </span>
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {THEMES.map((theme) => {
              const isActive = activeThemeId === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => {
                    applyTheme(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border-2 text-left transition-all ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/60 shadow-xs"
                      : "border-transparent hover:border-slate-300 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Palette swatches preview */}
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-xs border border-white/20 flex-shrink-0"
                      style={{ backgroundColor: theme.colors.bg }}
                    >
                      <span className="select-none">{theme.icon}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {theme.name}
                        </span>
                        {/* Accent dot */}
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0 shadow-2xs"
                          style={{ backgroundColor: theme.colors.accent }}
                        />
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {theme.mood}
                      </p>
                    </div>
                  </div>

                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
