"use client";

import React, { useState, useRef, useEffect } from "react";
import { useLanguage, SUPPORTED_LANGUAGES, CONTINENTS, Continent, Language } from "@/lib/i18n";
import { Globe, Check, ChevronDown } from "lucide-react";

export function LanguageSelector({ className = "" }: { className?: string }) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption =
    SUPPORTED_LANGUAGES.find((opt) => opt.code === language) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs transition-all hover:scale-105 active:scale-95"
        title={t("selectLanguage")}
      >
        <span className="text-sm leading-none">{currentOption.flag}</span>
        <span className="font-bold text-[11px] font-mono tracking-tight">{currentOption.shortLabel}</span>
        <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-h-[420px] overflow-y-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-indigo-500/10 z-50 p-2 animate-fadeIn divide-y divide-slate-100 dark:divide-slate-800/80">
          <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t("selectLanguage")}</span>
            </div>
            <span className="text-[10px] font-mono font-semibold text-slate-400">
              {SUPPORTED_LANGUAGES.length}
            </span>
          </div>

          {CONTINENTS.map((cont) => {
            const langsInContinent = SUPPORTED_LANGUAGES.filter(
              (opt) => opt.continent === cont.id
            );
            if (langsInContinent.length === 0) return null;

            return (
              <div key={cont.id} className="py-2 first:pt-1 last:pb-1">
                {/* Continent Group Header */}
                <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <span>{cont.icon}</span>
                    <span>{cont.label}</span>
                  </span>
                  <span className="text-[9px] font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-500">
                    {langsInContinent.length}
                  </span>
                </div>

                {/* Languages in Continent */}
                <div className="space-y-0.5 mt-1">
                  {langsInContinent.map((opt) => {
                    const isSelected = opt.code === language;
                    return (
                      <button
                        key={opt.code}
                        type="button"
                        onClick={() => {
                          setLanguage(opt.code);
                          setIsOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base flex-shrink-0">{opt.flag}</span>
                          <span className="truncate">{opt.nativeName}</span>
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold uppercase">
                            {opt.shortLabel}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
