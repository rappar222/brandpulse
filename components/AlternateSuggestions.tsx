"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  ChevronDown,
  Globe,
} from "lucide-react";
import {
  SUGGESTION_CATEGORIES,
  SuggestionCategory,
  generateSuggestionsByCategory,
} from "@/lib/suggestions";
import { useLanguage } from "@/lib/i18n";

interface AlternateSuggestionsProps {
  suggestions: string[];
  onSelectSuggestion: (name: string) => void;
  originalName: string;
  customTlds?: string[];
}

const DEFAULT_TLDS = ["com", "org", "io", "dev", "app", "ai"];

export function AlternateSuggestions({
  suggestions,
  onSelectSuggestion,
  originalName,
  customTlds = [],
}: AlternateSuggestionsProps) {
  const { t } = useLanguage();
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [baseTld, setBaseTld] = useState<string>("com");
  const [modCategory, setModCategory] = useState<SuggestionCategory>("popular");
  const [chipTldMap, setChipTldMap] = useState<Record<string, string>>({});
  const [openDropdownAlt, setOpenDropdownAlt] = useState<string | null>(null);
  const [isHeaderTldOpen, setIsHeaderTldOpen] = useState(false);
  const [localCustomTlds, setLocalCustomTlds] = useState<string[]>([]);

  const activeSuggestions =
    modCategory === "popular"
      ? suggestions
      : generateSuggestionsByCategory(originalName, modCategory);

  // Sync custom TLDs from localStorage as well
  useEffect(() => {
    const syncLocalTlds = () => {
      try {
        const stored = localStorage.getItem("brandpulse_custom_tlds");
        if (stored) {
          setLocalCustomTlds(JSON.parse(stored));
        }
      } catch {}
    };

    syncLocalTlds();
    window.addEventListener("storage", syncLocalTlds);
    const interval = setInterval(syncLocalTlds, 1000);
    return () => {
      window.removeEventListener("storage", syncLocalTlds);
      clearInterval(interval);
    };
  }, []);

  const combinedCustomTlds = Array.from(
    new Set(
      [...(customTlds || []), ...localCustomTlds]
        .map((t) => t.trim().toLowerCase().replace(/^\.+/, ""))
        .filter((t) => t && !DEFAULT_TLDS.includes(t))
    )
  );

  // Cache: statusCache[tld][name] = boolean
  const [statusCache, setStatusCache] = useState<Record<string, Record<string, boolean>>>({});
  const statusCacheRef = useRef<Record<string, Record<string, boolean>>>({});
  const [loadingTlds, setLoadingTlds] = useState<Record<string, boolean>>({});

  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    statusCacheRef.current = statusCache;
  }, [statusCache]);

  // When originalName changes, reset statusCache and individual chip overrides
  useEffect(() => {
    setChipTldMap({});
    setStatusCache({});
    statusCacheRef.current = {};
  }, [originalName]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdownAlt(null);
        setIsHeaderTldOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Fetch verification for a specific TLD
  const verifyTldForNames = (tld: string, names: string[]) => {
    const cleanTld = tld.trim().toLowerCase().replace(/^\.+/, "");
    if (!cleanTld || names.length === 0) return;

    // Filter to names that haven't been fetched yet for this TLD
    const currentTldCache = statusCacheRef.current[cleanTld] || {};
    const missingNames = names.filter(
      (n) => typeof currentTldCache[n] !== "boolean"
    );

    if (missingNames.length === 0) {
      return;
    }

    setLoadingTlds((prev) => ({ ...prev, [cleanTld]: true }));

    fetch(
      `/api/verify-suggestions?names=${encodeURIComponent(missingNames.join(","))}&tld=${encodeURIComponent(
        cleanTld
      )}`
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.results) {
          setStatusCache((prev) => {
            const next = {
              ...prev,
              [cleanTld]: {
                ...(prev[cleanTld] || {}),
                ...data.results,
              },
            };
            statusCacheRef.current = next;
            return next;
          });
        }
      })
      .catch(() => {
        // Ignore network errors
      })
      .finally(() => {
        setLoadingTlds((prev) => ({ ...prev, [cleanTld]: false }));
      });
  };

  // Whenever activeSuggestions, baseTld, or originalName changes, verify baseTld
  useEffect(() => {
    if (!activeSuggestions || activeSuggestions.length === 0) return;
    verifyTldForNames(baseTld, activeSuggestions);
  }, [activeSuggestions, baseTld, originalName]);

  if (!activeSuggestions || activeSuggestions.length === 0) return null;

  const handleCopy = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(name);
    setCopiedName(name);
    setTimeout(() => setCopiedName(null), 1800);
  };

  const handleSelectTldForChip = (alt: string, newTld: string) => {
    const clean = newTld.replace(/^\.+/, "");
    setChipTldMap((prev) => ({ ...prev, [alt]: clean }));
    setOpenDropdownAlt(null);
    verifyTldForNames(clean, [alt]);
  };

  const handleSelectGlobalTld = (newTld: string) => {
    const clean = newTld.replace(/^\.+/, "");
    setBaseTld(clean);
    setChipTldMap({}); // reset individual overrides to follow new global base
    setIsHeaderTldOpen(false);
    verifyTldForNames(clean, activeSuggestions);
  };

  const currentTldCache = statusCache[baseTld] || {};
  const isBaseLoading = loadingTlds[baseTld] === true;

  // Calculate count of verified available for current base TLD & active category
  const availableCount = activeSuggestions.filter((alt) => currentTldCache[alt] === true).length;

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border-2 theme-banner-box p-4 sm:p-5 shadow-sm space-y-3.5 relative"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-indigo-200/50 dark:border-indigo-900/40">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="p-2 rounded-xl theme-gradient-logo text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                {t("preVerifiedAlternates")} &ldquo;{originalName}&rdquo;
              </h4>

              {isBaseLoading ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <Loader2 className="w-3 h-3 animate-spin text-indigo-500" />
                  <span>Checking .{baseTld}...</span>
                </span>
              ) : (
                availableCount > 0 && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>
                      {availableCount} .{baseTld} {t("availableNow")}
                    </span>
                  </span>
                )
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("alternatesSubtitleWithTld").replace(".{baseTld}", `.${baseTld}`)}
            </p>
          </div>
        </div>

        {/* Global TLD Selector in header */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsHeaderTldOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border-2 border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-slate-800 dark:text-slate-200 font-mono text-xs font-bold shadow-2xs transition-all"
              title="Change default TLD for all alternates"
            >
              <Globe className="w-3 h-3 text-indigo-500" />
              <span>.{baseTld}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {isHeaderTldOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[150px] max-h-64 overflow-y-auto rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1.5 animate-fadeIn text-xs">
                <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  Top TLDs
                </div>
                {DEFAULT_TLDS.map((tld) => (
                  <button
                    key={tld}
                    type="button"
                    onClick={() => handleSelectGlobalTld(tld)}
                    className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between font-mono text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${
                      baseTld === tld
                        ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-slate-800/50"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>.{tld}</span>
                    {baseTld === tld && <Check className="w-3 h-3 text-indigo-500" />}
                  </button>
                ))}

                {combinedCustomTlds.length > 0 && (
                  <>
                    <div className="px-2.5 py-1 mt-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 border-t border-b border-slate-100 dark:border-slate-800">
                      Custom TLDs
                    </div>
                    {combinedCustomTlds.map((clean) => (
                      <button
                        key={clean}
                        type="button"
                        onClick={() => handleSelectGlobalTld(clean)}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between font-mono text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${
                          baseTld === clean
                            ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-slate-800/50"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span>.{clean}</span>
                        {baseTld === clean && (
                          <Check className="w-3 h-3 text-indigo-500" />
                        )}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/80 px-2.5 py-1 rounded-full border border-indigo-200/60 dark:border-indigo-800/60">
            {activeSuggestions.length} variations
          </span>
        </div>
      </div>

      {/* Industry / Vibe Modifier Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
          Industry Style:
        </span>
        {SUGGESTION_CATEGORIES.map((cat) => {
          const categoryLabels: Record<string, string> = {
            popular: t("popMix"),
            tech: t("techAiCloud"),
            company: t("corpGroup"),
            studio: t("agencyStudio"),
            action: t("consumerAction"),
          };
          const label = categoryLabels[cat.id] || cat.label;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setModCategory(cat.id)}
              title={cat.description}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                modCategory === cat.id
                  ? "bg-indigo-600 text-white shadow-2xs"
                  : "bg-white/80 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-indigo-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Suggestion Chips */}
      <div className="flex flex-wrap gap-2">
        {activeSuggestions.map((alt) => {
          const chipTld = chipTldMap[alt] || baseTld;
          const tldCache = statusCache[chipTld] || {};
          const hasChecked = Object.prototype.hasOwnProperty.call(tldCache, alt);
          const isAvail = tldCache[alt] === true;
          const isChipLoading = loadingTlds[chipTld] === true && !hasChecked;
          const isDropdownOpen = openDropdownAlt === alt;

          return (
            <div
              key={alt}
              onClick={() => onSelectSuggestion(alt)}
              className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 shadow-2xs hover:shadow-xs cursor-pointer transition-all duration-150 ${
                hasChecked && isAvail
                  ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-400/90 dark:border-emerald-700/80 hover:border-emerald-500 text-slate-900 dark:text-white"
                  : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-400 text-slate-800 dark:text-slate-200"
              }`}
            >
              {/* Interactive TLD Button with Dropdown */}
              <div className="relative" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdownAlt((prev) => (prev === alt ? null : alt))
                  }
                  className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-1.5 py-0.5 rounded transition-all select-none ${
                    isChipLoading
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500"
                      : hasChecked && isAvail
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                      : hasChecked && !isAvail
                      ? "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700 line-through"
                      : "bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100"
                  }`}
                  title={`Click to change TLD from .${chipTld} to another top or custom TLD`}
                >
                  {isChipLoading ? (
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  ) : (
                    <span>.{chipTld}</span>
                  )}
                  {hasChecked && isAvail && <span>✓</span>}
                  <ChevronDown className="w-2.5 h-2.5 opacity-80" />
                </button>

                {/* Dropdown Menu for this chip */}
                {isDropdownOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1.5 z-50 min-w-[145px] max-h-64 overflow-y-auto rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl py-1.5 animate-fadeIn text-xs"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800">
                      Top TLDs
                    </div>
                    {DEFAULT_TLDS.map((tld) => (
                      <button
                        key={tld}
                        type="button"
                        onClick={() => handleSelectTldForChip(alt, tld)}
                        className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between font-mono text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${
                          chipTld === tld
                            ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-slate-800/50"
                            : "text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <span>.{tld}</span>
                        {chipTld === tld && (
                          <Check className="w-3 h-3 text-indigo-500" />
                        )}
                      </button>
                    ))}

                    {combinedCustomTlds.length > 0 && (
                      <>
                        <div className="px-2.5 py-1 mt-1 text-[10px] font-extrabold uppercase tracking-wider text-indigo-500 dark:text-indigo-400 border-t border-b border-slate-100 dark:border-slate-800">
                          Custom TLDs
                        </div>
                        {combinedCustomTlds.map((clean) => (
                          <button
                            key={clean}
                            type="button"
                            onClick={() => handleSelectTldForChip(alt, clean)}
                            className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between font-mono text-xs hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors ${
                              chipTld === clean
                                ? "font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-slate-800/50"
                                : "text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <span>.{clean}</span>
                            {chipTld === clean && (
                              <Check className="w-3 h-3 text-indigo-500" />
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Alternate Name */}
              <span className="font-mono font-bold text-xs sm:text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {alt}
              </span>

              {/* Claim Button */}
              {hasChecked && isAvail && (
                <Link
                  href={`/offers?domain=${encodeURIComponent(`${alt}.${chipTld}`)}&from=${encodeURIComponent(
                    alt
                  )}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-600/15 hover:bg-emerald-600 text-emerald-700 dark:text-emerald-300 hover:text-white text-[10px] font-bold transition-colors"
                  title={`Claim ${alt}.${chipTld}`}
                >
                  <ShoppingCart className="w-2.5 h-2.5" />
                  <span>Claim</span>
                </Link>
              )}

              {/* Copy Alternate Button */}
              <button
                type="button"
                onClick={(e) => handleCopy(e, alt)}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title={`Copy "${alt}"`}
              >
                {copiedName === alt ? (
                  <Check className="w-3 h-3 text-emerald-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>

              <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-transform group-hover:translate-x-0.5" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
