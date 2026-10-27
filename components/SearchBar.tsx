"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { sanitizeBrandName } from "@/lib/checkers";
import { useLanguage } from "@/lib/i18n";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearchImmediate: (value: string) => void;
  isLoading: boolean;
  debounceMs?: number;
}

export function SearchBar({
  value,
  onChange,
  onSearchImmediate,
  isLoading,
  debounceMs = 700,
}: SearchBarProps) {
  const { t } = useLanguage();
  const [internalValue, setInternalValue] = useState(value);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal value when external value changes (e.g. clicking suggested alternate)
  useEffect(() => {
    setInternalValue(value);
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInternalValue(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onChange(val);
    }, debounceMs);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearchImmediate(internalValue);
    }
  };

  const handleClear = () => {
    setInternalValue("");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    onChange("");
  };

  const sanitized = sanitizeBrandName(internalValue);
  const showSanitizedNote =
    internalValue.trim().length > 0 &&
    sanitized.length > 0 &&
    sanitized !== internalValue.trim().toLowerCase();

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3">
      <div className="relative group">
        <div className="flex items-center rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-md shadow-indigo-500/5 focus-within:border-indigo-600 dark:focus-within:border-indigo-500 transition-all p-1.5 pl-3 sm:p-2 sm:pl-4">
          <div className="text-slate-400 mr-2 sm:mr-3 flex-shrink-0">
            {isLoading ? (
              <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-indigo-500" />
            ) : (
              <Search className="w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-indigo-500 transition-colors" />
            )}
          </div>

          <input
            type="text"
            value={internalValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={t("searchPlaceholder")}
            className="w-full min-w-0 bg-transparent border-none text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 outline-none text-sm sm:text-lg font-medium tracking-tight pr-1 sm:pr-2"
            autoFocus
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />

          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 mr-0.5 sm:mr-1">
            {internalValue && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 sm:p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={() => onSearchImmediate(internalValue)}
              disabled={!internalValue.trim() || isLoading}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:pointer-events-none text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-1 sm:gap-1.5 flex-shrink-0"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" />
                  <span>{t("checking")}</span>
                </>
              ) : (
                <span>{t("checkNow")}</span>
              )}
            </button>
          </div>
        </div>

        {showSanitizedNote && (
          <div className="absolute -bottom-6 left-4 text-[11px] text-slate-500 dark:text-slate-400">
            Checking clean handle: <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{sanitized}</span>
          </div>
        )}
      </div>
    </div>
  );
}
