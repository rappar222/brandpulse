"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  REGISTRARS,
  getDomainTld,
  getRegistrarPriceForTld,
  getRegistrarsForTld,
  Registrar,
} from "@/lib/registrars";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import { RegistrarLogo } from "@/components/RegistrarLogo";
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Tag,
  Sparkles,
  TrendingDown,
  Info,
  Calendar,
  Globe,
  SlidersHorizontal,
  Download,
} from "lucide-react";

function RegistrarDescription({
  tagline,
  description,
}: {
  tagline: string;
  description: string;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="w-full">
      {isExpanded ? (
        <div className="space-y-2 animate-fadeIn">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-700/70 shadow-xs">
            {description}
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded(false);
            }}
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
          >
            Show less
          </button>
        </div>
      ) : (
        <div className="flex items-center w-full min-w-0">
          <span
            onClick={() => setIsExpanded(true)}
            className="text-xs text-slate-500 dark:text-slate-400 truncate cursor-pointer hover:text-slate-700 dark:hover:text-slate-200"
            title="Click ... to view full seller description"
          >
            {tagline}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-md bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 font-bold text-xs tracking-wider border border-indigo-200/60 dark:border-indigo-800/60 transition-all hover:scale-105 active:scale-95 shadow-2xs flex-shrink-0 cursor-pointer"
            title="Click ... to toggle full seller description"
            aria-label="Expand seller description"
          >
            ...
          </button>
        </div>
      )}
    </div>
  );
}

function OffersContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const domainParam = searchParams.get("domain") || "example.com";
  const fromParam = searchParams.get("from");

  const [activeDomain, setActiveDomain] = useState(domainParam);
  const [sortOption, setSortOption] = useState<"best" | "reg" | "ren" | "total">("best");
  const [filterPrivacy, setFilterPrivacy] = useState(false);
  const [filterFlatRenewal, setFilterFlatRenewal] = useState(false);
  const [yearsDuration, setYearsDuration] = useState<number>(1);
  const [tldOptions, setTldOptions] = useState<string[]>([
    ".com",
    ".org",
    ".io",
    ".dev",
    ".app",
    ".ai",
  ]);
  const [customTldInput, setCustomTldInput] = useState("");

  // Extract base name and TLD
  const currentTld = useMemo(() => getDomainTld(activeDomain), [activeDomain]);

  useEffect(() => {
    if (currentTld) {
      const dot = `.${currentTld}`;
      setTldOptions((prev) => (prev.includes(dot) ? prev : [...prev, dot]));
    }
  }, [currentTld]);

  const baseName = useMemo(() => {
    const clean = activeDomain.replace(/^https?:\/\//, "");
    const parts = clean.split(".");
    return parts[0] || "example";
  }, [activeDomain]);

  const backHref = fromParam
    ? `/?q=${encodeURIComponent(fromParam)}`
    : `/?q=${encodeURIComponent(baseName)}`;

  const handleAddCustomTld = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTldInput
      .trim()
      .toLowerCase()
      .replace(/^\.+/, "")
      .replace(/\.+$/, "")
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/\.{2,}/g, ".");
    if (!clean) return;
    const withDot = `.${clean}`;
    if (!tldOptions.includes(withDot)) {
      setTldOptions([...tldOptions, withDot]);
    }
    setActiveDomain(`${baseName}${withDot}`);
    setCustomTldInput("");
  };

  // Filter registrars that strictly support this TLD
  const supportedRegistrars = useMemo(() => {
    return getRegistrarsForTld(currentTld);
  }, [currentTld]);

  // Live verified registry and pricing data from real SRS/registrar database
  const [liveData, setLiveData] = useState<{
    domain: string;
    tld: string;
    isAvailable: boolean;
    isPremium: boolean;
    tierClass?: string | null;
    exactPrice?: number | null;
    renewalPrice?: number | null;
    registrars: Array<{
      id: string;
      name: string;
      tagline: string;
      description: string;
      badge: string;
      badgeColor: string;
      logoEmoji: string;
      whoisPrivacy: string;
      features: {
        freePrivacy: boolean;
        freeDnssec: boolean;
        zeroMarkup: boolean;
        flatRenewal: boolean;
      };
      highlights: string[];
      searchUrl: string;
      regPrice: number;
      renPrice: number;
      supported: boolean;
      unsupportedReason?: string;
    }>;
  } | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoadingLive(true);
    setLiveData(null);
    fetch(`/api/domain-offers?domain=${encodeURIComponent(activeDomain)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        setLiveData(data);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setIsLoadingLive(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeDomain]);

  // Ineligible registrars for this domain (e.g. Cloudflare on premium domains or unsupported ccTLDs)
  const ineligibleRegistrars = useMemo(() => {
    return (liveData?.registrars || []).filter((r) => r.supported === false);
  }, [liveData]);

  // Calculate and sort registrar offers from live verified database
  const offers = useMemo(() => {
    if (!liveData?.registrars) return [];

    // Exclude registrars that do not support this specific domain (e.g. Cloudflare on premium domains)
    const validList = liveData.registrars.filter((r) => r.supported !== false);

    let list = validList.map((r) => {
      const reg = r.regPrice;
      const ren = r.renPrice;
      const totalCost = reg + (yearsDuration - 1) * ren;
      const renewalDiff = ren - reg;

      // Score for "best offer": lower price + perks
      let score = 100 - reg * 1.5;
      if (r.features.freePrivacy) score += 8;
      if (r.features.flatRenewal) score += 6;
      if (r.features.zeroMarkup) score += 10;
      if (r.features.freeDnssec) score += 4;

      return {
        ...r,
        currentPrice: { reg, ren },
        totalCost,
        renewalDiff,
        score,
      };
    });

    if (filterPrivacy) {
      list = list.filter((r) => r.features.freePrivacy);
    }

    if (filterFlatRenewal) {
      list = list.filter((r) => r.features.flatRenewal);
    }

    list.sort((a, b) => {
      if (sortOption === "reg") return a.currentPrice.reg - b.currentPrice.reg;
      if (sortOption === "ren") return a.currentPrice.ren - b.currentPrice.ren;
      if (sortOption === "total") return a.totalCost - b.totalCost;
      return b.score - a.score;
    });

    return list;
  }, [liveData, yearsDuration, filterPrivacy, filterFlatRenewal, sortOption]);

  const lowestRegPrice = useMemo(() => {
    if (liveData?.isPremium && liveData.exactPrice) {
      return liveData.exactPrice;
    }
    if (offers.length === 0) return 9.77;
    return Math.min(...offers.map((o) => o.currentPrice.reg));
  }, [offers, liveData]);

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 glassmorphism sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("backToChecker")}</span>
            </Link>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md overflow-hidden border border-cyan-500/30 bg-[#02040a] flex items-center justify-center flex-shrink-0">
                <img src="/logo.svg" alt="PulsarCheck" className="w-full h-full object-cover" />
              </div>
              <span className="text-base font-extrabold theme-gradient-title">
                PulsarCheck
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                {t("registrarDeals")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/brandpulse-architecture.svg"
              download="brandpulse-architecture.svg"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs hover:shadow-xs transition-all group"
              title="Download System Architecture Scheme (SVG)"
            >
              <Download className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline">Architecture</span>
              <span className="text-[10px] font-mono uppercase px-1 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                SVG
              </span>
            </a>

            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 flex-1 w-full">
        {/* Domain Banner */}
        <section className="relative overflow-hidden rounded-3xl border-2 theme-banner-box p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t("domainAvailable")}</span>
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    {activeDomain}
                  </h1>
                  {liveData?.isPremium && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 text-xs">
                      <span>★</span>
                      <span>{t("topPick")}</span>
                    </span>
                  )}
                  {liveData?.isPremium && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700">
                      {t("premium")}
                    </span>
                  )}
                </div>

                {liveData?.isPremium ? (
                  <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 font-medium mt-1.5 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <span>
                      High-value registry tier ({liveData.tierClass || t("premium")}). Live registry wholesale registration &amp; renewal: ${liveData.exactPrice?.toFixed(2)}{t("perYear")}.
                    </span>
                  </p>
                ) : (
                  <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1">
                    {t("compareRates")}
                  </p>
                )}
              </div>

              {/* TLD Switcher */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <span className="text-xs text-slate-500 font-medium">{t("switchTld")}</span>
                {tldOptions.map((tld) => {
                  const targetDomain = `${baseName}${tld}`;
                  const isActive = activeDomain === targetDomain;
                  return (
                    <button
                      key={tld}
                      onClick={() => setActiveDomain(targetDomain)}
                      className={`px-3 py-1 rounded-xl text-xs font-mono font-semibold transition-all ${
                        isActive
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:border-indigo-400"
                      }`}
                    >
                      {tld}
                    </button>
                  );
                })}

                {/* Custom TLD Input Box */}
                <form
                  onSubmit={handleAddCustomTld}
                  className="flex items-center gap-1.5 ml-1"
                >
                  <input
                    type="text"
                    value={customTldInput}
                    onChange={(e) => setCustomTldInput(e.target.value)}
                    placeholder={t("addCustomTld")}
                    className="w-36 px-2.5 py-1 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-indigo-500 font-mono"
                  />
                  <button
                    type="submit"
                    disabled={!customTldInput.trim()}
                    className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold border border-slate-200/80 dark:border-slate-700 disabled:opacity-40 transition-colors"
                  >
                    {t("addCheckBtn")}
                  </button>
                </form>
              </div>

              {/* Direct Registrar Claim Buttons (Filtered by verified TLD support & premium eligibility) */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                <span className="text-xs text-slate-500 font-bold">{t("registerOn")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {isLoadingLive ? (
                    <span className="text-xs text-slate-400 font-mono animate-pulse">
                      {t("checkingDb")}
                    </span>
                  ) : (
                    offers.map((reg) => (
                      <a
                        key={reg.id}
                        href={reg.searchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 text-slate-700 dark:text-slate-200 transition-all shadow-2xs hover:shadow-xs group"
                        title={`Register ${activeDomain} on ${reg.name} (Verified provider)`}
                      >
                        <span className="text-sm">{reg.logoEmoji}</span>
                        <span>{reg.name}</span>
                        <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </a>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Price Highlight Card */}
            <div className="flex-shrink-0 p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-indigo-100 dark:border-slate-800 shadow-lg shadow-indigo-500/5 text-center min-w-[210px]">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {liveData?.isPremium ? t("premiumRate") : t("startingFrom")}
              </span>
              <div className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                {isLoadingLive ? (
                  <span className="text-xl text-slate-400 font-mono animate-pulse">Checking DB...</span>
                ) : (
                  <>
                    ${lowestRegPrice.toFixed(2)}
                    <span className="text-xs font-normal text-slate-500">/{t("year")}</span>
                  </>
                )}
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {liveData?.isPremium
                  ? `${t("renewsAt")} $${(liveData.renewalPrice || lowestRegPrice).toFixed(2)}/${t("year")}`
                  : t("verifiedPrice")}
              </span>
            </div>
          </div>
        </section>

        {/* Controls Bar: Sorting, Filters & Multi-Year Calculator */}
        <section className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900/80 border-2 border-slate-300 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Sorting & Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("sortLabel")}
                </span>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as any)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0 focus:border-indigo-500"
                >
                  <option value="best">{t("sortBest")}</option>
                  <option value="reg">{t("sortReg")}</option>
                  <option value="ren">{t("sortRen")}</option>
                  <option value="total">{t("sortTotal")}</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFilterPrivacy(!filterPrivacy)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    filterPrivacy
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                      : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  {t("freePrivacyOnly")}
                </button>

                <button
                  onClick={() => setFilterFlatRenewal(!filterFlatRenewal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                    filterFlatRenewal
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700"
                      : "bg-transparent text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  {t("flatRenewalOnly")}
                </button>
              </div>
            </div>

            {/* Multi-Year Duration Picker */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("holdingPeriod")}
              </span>
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60">
                {[1, 2, 3, 5].map((y) => (
                  <button
                    key={y}
                    onClick={() => setYearsDuration(y)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                      yearsDuration === y
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {y} {y === 1 ? t("year") : t("years")}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Registrar Offers Grid (or Loading Skeletons) */}
        {isLoadingLive ? (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 animate-pulse space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="h-5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                  </div>
                  <div className="h-5 w-16 bg-slate-200 dark:bg-slate-800 rounded-full" />
                </div>
                <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/50 space-y-2">
                  <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded" />
                  <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded" />
                </div>
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-800 rounded-xl" />
              </div>
            ))}
          </section>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {offers.map((offer, index) => {
              const isLowestReg = offer.currentPrice.reg === lowestRegPrice;
              const hasRenewalSpike = offer.renewalDiff > 3;

              return (
                <div
                  key={offer.id}
                  className={`relative flex flex-col justify-between rounded-3xl border-2 bg-white dark:bg-slate-900 p-6 transition-all duration-200 hover:shadow-lg ${
                    index === 0
                      ? "border-indigo-500 dark:border-indigo-500 shadow-md ring-1 ring-indigo-500/20"
                      : "border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 shadow-xs"
                  }`}
                >
                  <div>
                    {/* Top Header: Logo + Name on left, Badge on right */}
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100/90 dark:bg-slate-800/90 flex items-center justify-center p-2 shadow-xs border border-slate-200/60 dark:border-slate-700/60 flex-shrink-0">
                          <RegistrarLogo id={offer.id} className="w-7 h-7" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white truncate">
                            {offer.name}
                          </h3>
                        </div>
                      </div>

                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${offer.badgeColor}`}
                      >
                        {offer.badge === "Best At-Cost" ? t("bestAtCost") : offer.badge}
                      </span>
                    </div>

                    {/* Full Width Description Row */}
                    <div className="mb-4">
                      <RegistrarDescription
                        tagline={offer.tagline}
                        description={offer.description}
                      />
                    </div>

                    {/* Pricing Box */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 mb-4 space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {t("firstYearReg")}
                        </span>
                        <span className="text-2xl font-black text-slate-900 dark:text-white">
                          ${offer.currentPrice.reg.toFixed(2)}
                          {isLowestReg && (
                            <span className="ml-1.5 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                              {t("lowest")}
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-slate-500 dark:text-slate-400">
                          {t("annualRenewal")}
                        </span>
                        <span
                          className={`font-semibold ${
                            hasRenewalSpike
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          ${offer.currentPrice.ren.toFixed(2)}/{t("year")}
                          {hasRenewalSpike && (
                            <span
                              className="ml-1 text-[10px] text-amber-500"
                              title={`Renewal increases by $${offer.renewalDiff.toFixed(2)}`}
                            >
                              (+${offer.renewalDiff.toFixed(2)})
                            </span>
                          )}
                        </span>
                      </div>

                      {yearsDuration > 1 && (
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/60 text-indigo-600 dark:text-indigo-400 font-bold">
                          <span>{yearsDuration}-{t("year")} Total:</span>
                          <span>${offer.totalCost.toFixed(2)}</span>
                        </div>
                      )}
                    </div>

                    {/* Perks & Features */}
                    <div className="space-y-2 mb-6">
                      <div className="flex items-center gap-2 text-xs">
                        <ShieldCheck
                          className={`w-4 h-4 ${
                            offer.features.freePrivacy
                              ? "text-emerald-500"
                              : "text-slate-400"
                          }`}
                        />
                        <span className="text-slate-700 dark:text-slate-300">
                          {t("whoisPrivacyLabel")}{" "}
                          <strong className="font-semibold text-slate-900 dark:text-white">
                            {offer.whoisPrivacy === "Free Forever" ? t("freeForever") : offer.whoisPrivacy}
                          </strong>
                        </span>
                      </div>

                      <ul className="space-y-1.5 pt-1">
                        {offer.highlights.map((hl, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
                            <span>
                              {hl === "Wholesale at-cost pricing"
                                ? t("wholesaleAtCostDesc")
                                : hl === "Zero markup on renewals"
                                ? t("zeroMarkupOnRenewals")
                                : hl === "Free WHOIS privacy & DNSSEC"
                                ? t("freeWhoisPrivacy")
                                : hl === "Enterprise Anycast DNS network"
                                ? t("enterpriseAnycastDns")
                                : hl}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Direct Action Link */}
                  <a
                    href={offer.searchUrl || (offer as any).getSearchUrl?.(activeDomain) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-center shadow-xs flex items-center justify-center gap-2 transition-all ${
                      index === 0
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20"
                        : "bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900"
                    }`}
                  >
                    <span>{t("claimOn")} {offer.name}</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              );
            })}
          </section>
        )}

        {/* Ineligible Registrars Notice (if any registrars cannot register this domain) */}
        {!isLoadingLive && ineligibleRegistrars.length > 0 && (
          <section className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
              <Info className="w-4 h-4 text-slate-400" />
              <span>{t("ineligibleRegistrars")}</span>
            </div>
            <div className="flex flex-col gap-1.5">
              {ineligibleRegistrars.map((reg) => (
                <div
                  key={reg.id}
                  className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {reg.name}:
                  </span>
                  <span>{reg.unsupportedReason || "Does not support this domain extension or registry tier."}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Informative Guidance */}
        <section className="p-6 rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-sm">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>{t("smartBuyingAdvice")}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {t("adviceDesc")}
          </p>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-6 mt-12 bg-white/50 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">PulsarCheck</span>
            <span>•</span>
            <span>Domain Registrar Comparison & Live Availability</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <a
              href="/brandpulse-architecture.svg"
              download="brandpulse-architecture.svg"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium text-[11px]"
              title="Download Architecture Scheme (.svg)"
            >
              <Download className="w-3 h-3 text-indigo-500" />
              <span>Architecture Scheme (.svg)</span>
            </a>
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              Return to Handle Checker
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function OffersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading domain offers...
        </div>
      }
    >
      <OffersContent />
    </Suspense>
  );
}
