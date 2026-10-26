"use client";

import React, { useState } from "react";
import { CheckResult, ActiveTab, PersonaMode } from "@/lib/types";
import { analyzeBrandLinguistics } from "@/lib/suggestions";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Layers,
  Copy,
  Check,
  Sparkles,
  Scale,
  Star,
  Download,
  Briefcase,
  Terminal,
  Globe,
  Rocket,
  Printer,
  Mic,
  Award,
  HelpCircle,
} from "lucide-react";
import { ScoreBreakdownModal } from "./ScoreBreakdownModal";
import { useIsPhone } from "@/lib/useIsPhone";
import { useLanguage } from "@/lib/i18n";

interface StatsOverviewProps {
  results: CheckResult[];
  allResults?: CheckResult[];
  name: string;
  selectedCategory: ActiveTab;
  onSelectCategory: (cat: ActiveTab) => void;
  statusFilter: "all" | "available" | "taken" | "unknown";
  onSelectStatusFilter: (status: "all" | "available" | "taken" | "unknown") => void;
  wikiFound?: boolean | null;
  trademarkRisk?: "High" | "Medium" | "Low" | null;
  personaMode: PersonaMode;
  onSelectPersonaMode: (mode: PersonaMode) => void;
  isShortlisted: boolean;
  onToggleShortlist: () => void;
  onOpenChecklist?: () => void;
  isOwned?: boolean;
  onToggleOwnership?: () => void;
}

export function StatsOverview({
  results,
  allResults,
  name,
  selectedCategory,
  onSelectCategory,
  statusFilter,
  onSelectStatusFilter,
  wikiFound,
  trademarkRisk,
  personaMode,
  onSelectPersonaMode,
  isShortlisted,
  onToggleShortlist,
  onOpenChecklist,
  isOwned = false,
  onToggleOwnership,
}: StatsOverviewProps) {
  const { t } = useLanguage();
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

  const getCategoryLabel = (cat: ActiveTab) => {
    switch (cat) {
      case "All":
        return t("catAll");
      case "Domains":
        return t("catDomains");
      case "Social & Platforms":
        return t("catSocials");
      case "Package Registries":
        return t("catPackages");
      case "Trademark":
        return t("catTrademark");
      case "Wikipedia":
        return t("catWikipedia");
      default:
        return cat;
    }
  };

  const getPersonaLabel = (mode: PersonaMode) => {
    switch (mode) {
      case "all":
        return t("personaAll");
      case "startup":
        return t("personaStartup");
      case "developer":
        return t("personaDev");
      default:
        return mode;
    }
  };

  const availableCount = results.filter((r) => r.status === "available").length;
  const takenCount = results.filter((r) => r.status === "taken").length;
  const unknownCount = results.filter((r) => r.status === "unknown").length;
  const totalCount = results.length;

  // Compute Brandability Score (0 - 100) from full or current results
  const baseList = allResults && allResults.length > 0 ? allResults : results;
  const domains = baseList.filter((r) => r.category === "Domains");
  const socials = baseList.filter((r) => r.category === "Social & Platforms");
  const packages = baseList.filter((r) => r.category === "Package Registries");

  const findTld = (tld: string) =>
    domains.find((d) => d.platform.toLowerCase() === `.${tld}`)?.status || "unknown";

  const comStatus = findTld("com");
  const aiStatus = findTld("ai");
  const ioStatus = findTld("io");

  const domAvail = domains.filter((r) => r.status === "available").length;
  const socAvail = socials.filter((r) => r.status === "available").length;
  const pkgAvail = packages.filter((r) => r.status === "available").length;

  let brandScore = 0;
  if (comStatus === "available") brandScore += 30;
  if (aiStatus === "available") brandScore += 10;
  if (ioStatus === "available") brandScore += 10;
  brandScore += domains.length > 0 ? Math.round((domAvail / domains.length) * 15) : 0;
  brandScore += socials.length > 0 ? Math.round((socAvail / socials.length) * 25) : 0;
  brandScore += packages.length > 0 ? Math.round((pkgAvail / packages.length) * 10) : 0;

  // Waive trademark collision penalty if the user declared ownership of this company
  if (!isOwned) {
    if (trademarkRisk === "High") brandScore = Math.max(10, brandScore - 20);
    else if (trademarkRisk === "Medium") brandScore = Math.max(15, brandScore - 8);
  }
  brandScore = Math.min(100, Math.max(0, brandScore));

  const verdictLabel =
    isOwned
      ? t("verdictOwned")
      : brandScore >= 75 && trademarkRisk !== "High"
      ? t("verdictStrong")
      : brandScore >= 45 && trademarkRisk !== "High"
      ? t("verdictViable")
      : t("verdictHighCollision");

  const getRiskLabel = (risk?: "High" | "Medium" | "Low" | null) => {
    if (risk === "High") return t("riskHigh");
    if (risk === "Medium") return t("riskMedium");
    if (risk === "Low") return t("riskLow");
    return "";
  };

  const getLengthCategoryLabel = (lengthVerdict: string) => {
    const firstWord = lengthVerdict.split(" ")[0];
    if (firstWord === "Short") return t("lengthShort");
    if (firstWord === "Ideal") return t("lengthIdeal");
    if (firstWord === "Moderate") return t("lengthModerate");
    if (firstWord === "Long") return t("lengthLong");
    return firstWord;
  };

  const getRadioReasonLabel = () => {
    if (linguistics.radioTestPassed) {
      return t("radioPassed");
    }
    return linguistics.radioReason;
  };

  const getGlobalCheckLabel = () => {
    if (linguistics.globalCheck === "Clean across EN / EU languages") {
      return t("globalCheckClean");
    }
    return linguistics.globalCheck;
  };

  const linguistics = analyzeBrandLinguistics(name);

  const handleCopySummary = async () => {
    if (!results.length) return;
    const lines = [
      `PulsarCheck Availability Report for "${name}" (Brand Score: ${brandScore}/100 - ${verdictLabel}):`,
      `Linguistics: ${linguistics.length} chars (${linguistics.syllables} syllables) | ${linguistics.radioReason}`,
      `Total Targets: ${totalCount} | Available: ${availableCount} | Taken: ${takenCount} | Rate-limited/Error: ${unknownCount}`,
      "",
      ...results.map(
        (r) =>
          `- [${r.status.toUpperCase()}] ${r.platform} (${r.category})${
            r.handleTested ? ` [${r.handleTested}]` : ""
          }: ${r.url}`
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleExportCsv = () => {
    if (!results.length) return;
    const header = ["Platform", "Category", "Handle Tested", "Status", "URL", "Message"];
    const rows = results.map((r) => [
      `"${(r.platform || "").replace(/"/g, '""')}"`,
      `"${(r.category || "").replace(/"/g, '""')}"`,
      `"${(r.handleTested || name).replace(/"/g, '""')}"`,
      `"${r.status.toUpperCase()}"`,
      `"${(r.url || "").replace(/"/g, '""')}"`,
      `"${(r.message || "").replace(/"/g, '""')}"`,
    ]);
    const csvContent = [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `pulsarcheck-${name}-availability.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const categories: ActiveTab[] = [
    "All",
    "Domains",
    "Social & Platforms",
    "Package Registries",
    "Trademark",
    "Wikipedia",
  ];

  const isPhone = useIsPhone();

  if (isPhone) {
    return (
      <div className="space-y-2.5 w-full">
        {/* Phone Brand & Score Card */}
        <div className="p-3 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/60 bg-white/90 dark:bg-slate-900/90 shadow-xs flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-black text-base text-slate-900 dark:text-white truncate">
                {name}
              </h3>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {linguistics.length}c • {linguistics.syllables}s
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              <span className={comStatus === "available" ? "text-emerald-600 font-bold" : "text-rose-500"}>
                .com {comStatus === "available" ? "✓" : "✕"}
              </span>
              <span>•</span>
              <span className={aiStatus === "available" ? "text-emerald-600 font-bold" : "text-slate-400"}>
                .ai {aiStatus === "available" ? "✓" : "✕"}
              </span>
              <span>•</span>
              <span className={ioStatus === "available" ? "text-emerald-600 font-bold" : "text-slate-400"}>
                .io {ioStatus === "available" ? "✓" : "✕"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsScoreModalOpen(true)}
            className="flex-shrink-0 flex flex-col items-center justify-center px-2.5 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 text-white shadow-xs"
            title="Inspect Brand Score Breakdown"
          >
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">{t("overallScore")}</span>
            <span className="text-base font-black leading-none">{brandScore}</span>
          </button>
        </div>

        {/* Phone 4-Chip Filter Strip (All, Avail, Taken, Other) */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300/80 dark:border-slate-700/60 text-center">
          <button
            type="button"
            onClick={() => onSelectStatusFilter("all")}
            className={`flex-1 min-w-[70px] py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "all"
                ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {t("filterAll")} <span className="opacity-75 font-mono text-[10px]">({totalCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectStatusFilter("available")}
            className={`flex-1 min-w-[80px] py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "available"
                ? "bg-emerald-600 text-white shadow-2xs"
                : "text-emerald-700 dark:text-emerald-400"
            }`}
          >
            ✓ {t("filterAvailable")} <span className="opacity-85 font-mono text-[10px]">({availableCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectStatusFilter("taken")}
            className={`flex-1 min-w-[80px] py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "taken"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-rose-700 dark:text-rose-400"
            }`}
          >
            ✕ {t("filterTaken")} <span className="opacity-85 font-mono text-[10px]">({takenCount})</span>
          </button>
          <button
            type="button"
            onClick={() => onSelectStatusFilter("unknown")}
            className={`flex-1 min-w-[75px] py-1.5 px-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              statusFilter === "unknown"
                ? "bg-amber-600 text-white shadow-2xs"
                : "text-slate-600 dark:text-slate-400"
            }`}
          >
            ? {t("statusUnknown")} <span className="opacity-75 font-mono text-[10px]">({unknownCount})</span>
          </button>
        </div>

        {/* Phone Horizontal Scrollable Category Bar (Swipeable, with Indicators) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 px-0.5 -mx-1 text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat;
            const isWiki = cat === "Wikipedia";
            const isTrademark = cat === "Trademark";

            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {isWiki && (
                  <Sparkles className={`w-3 h-3 ${isSelected ? "text-white" : "text-indigo-500"}`} />
                )}
                {isTrademark && (
                  <Scale className={`w-3 h-3 ${isSelected ? "text-white" : "text-amber-500"}`} />
                )}
                <span>{getCategoryLabel(cat)}</span>
                {isWiki && wikiFound !== undefined && wikiFound !== null && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      wikiFound ? "bg-emerald-400" : "bg-slate-400"
                    }`}
                  />
                )}
                {isTrademark && trademarkRisk && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      trademarkRisk === "High"
                        ? "bg-rose-400"
                        : trademarkRisk === "Medium"
                        ? "bg-amber-400"
                        : "bg-emerald-400"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Phone Persona & Actions Strip */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between gap-2">
            {/* Persona */}
            <div className="inline-flex p-0.5 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 text-[11px] font-bold">
              <button
                type="button"
                onClick={() => onSelectPersonaMode("all")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  personaMode === "all" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-slate-500"
                }`}
              >
                {t("catAll")}
              </button>
              <button
                type="button"
                onClick={() => onSelectPersonaMode("startup")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  personaMode === "startup" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-slate-500"
                }`}
              >
                {t("personaStartup").split(" ")[0]}
              </button>
              <button
                type="button"
                onClick={() => onSelectPersonaMode("developer")}
                className={`px-2 py-1 rounded-lg transition-all ${
                  personaMode === "developer" ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs" : "text-slate-500"
                }`}
              >
                Dev
              </button>
            </div>

            {/* Quick Actions (Shortlist, Copy) */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={onToggleShortlist}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border text-[11px] font-bold transition-all ${
                  isShortlisted
                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                <Star className={`w-3 h-3 ${isShortlisted ? "fill-white" : "text-amber-500"}`} />
                <span>{isShortlisted ? t("shortlisted") : t("shortlist")}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="p-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                title="Copy Summary"
              >
                {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Full-width Claim Checklist Button on Phone */}
          {onOpenChecklist && (
            <button
              type="button"
              onClick={onOpenChecklist}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 active:bg-emerald-700 text-white text-xs font-bold shadow-2xs active:scale-98 transition-transform"
              title="Claim Checklist"
            >
              <Rocket className="w-3.5 h-3.5" />
              <span>{t("claimChecklist")} ({availableCount})</span>
            </button>
          )}
        </div>

        {/* Score Breakdown Modal */}
        {isScoreModalOpen && (
          <ScoreBreakdownModal
            brandName={name}
            brandScore={brandScore}
            verdictLabel={verdictLabel}
            comStatus={comStatus}
            aiStatus={aiStatus}
            ioStatus={ioStatus}
            domains={domains}
            socials={socials}
            packages={packages}
            linguistics={linguistics}
            trademarkRisk={trademarkRisk}
            isOwned={isOwned}
            onToggleOwnership={onToggleOwnership}
            onClose={() => setIsScoreModalOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Executive Brandability Score & Linguistic "Radio Test" Scorecard Banner */}
      {totalCount > 0 && (
        <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/95 p-4 sm:p-5 shadow-xs space-y-4">
          {/* Top Row: Score + Verdict on Left, Key TLDs + Legal Risk on Right */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black border-2 flex-shrink-0 shadow-xs ${
                  brandScore >= 75 && trademarkRisk !== "High"
                    ? "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                    : brandScore >= 45 && trademarkRisk !== "High"
                    ? "bg-amber-50 dark:bg-amber-950/70 border-amber-400 dark:border-amber-700 text-amber-700 dark:text-amber-300"
                    : "bg-rose-50 dark:bg-rose-950/70 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300"
                }`}
              >
                <span className="text-xl leading-none">{brandScore}</span>
                <span className="text-[9px] uppercase tracking-wider opacity-75 mt-0.5">
                  / 100
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                  {t("executiveVerdict")}
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold border ${
                      brandScore >= 75 && (isOwned || trademarkRisk !== "High")
                        ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                        : brandScore >= 45 && (isOwned || trademarkRisk !== "High")
                        ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : "bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
                    }`}
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>{verdictLabel}</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setIsScoreModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors shadow-2xs cursor-pointer"
                    title="View why it got this score & full mathematical breakdown"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t("whyThisScore")}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Key TLD & Trademark Snapshot Pills */}
            <div className="flex items-center gap-2 flex-wrap text-xs sm:justify-end">
              {[
                { label: ".com", status: comStatus },
                { label: ".ai", status: aiStatus },
                { label: ".io", status: ioStatus },
              ].map((tldItem) => (
                <span
                  key={tldItem.label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-mono text-xs font-bold border ${
                    tldItem.status === "available"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 line-through"
                  }`}
                >
                  {tldItem.status === "available" ? "✓" : "✕"} {tldItem.label}
                </span>
              ))}

              {trademarkRisk && (
                <button
                  type="button"
                  onClick={() => onSelectCategory("Trademark")}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-colors ${
                    isOwned
                      ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                      : trademarkRisk === "High"
                      ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100"
                      : trademarkRisk === "Medium"
                      ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100"
                      : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100"
                  }`}
                  title={isOwned ? "You own this company — warnings muted" : "Click to inspect Trademark & Corporate Clearance"}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>{isOwned ? `✓ ${t("ownedEntity")}` : `${t("legalRisk")} ${getRiskLabel(trademarkRisk)}`}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Row: 3 Equal-Width Aligned Linguistic & Radio Test Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-slate-200/80 dark:border-slate-800/80 text-xs items-stretch">
            <div className="w-full min-w-0 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                {t("lengthAndSyllables")}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={`${linguistics.length} ${t("chars")} • ${linguistics.syllables} ${linguistics.syllables === 1 ? t("syllable") : t("syllables")} (${getLengthCategoryLabel(linguistics.lengthVerdict)})`}>
                {linguistics.length} {t("chars")} • {linguistics.syllables} {linguistics.syllables === 1 ? t("syllable") : t("syllables")} ({getLengthCategoryLabel(linguistics.lengthVerdict)})
              </span>
            </div>

            <div
              className={`w-full min-w-0 px-3.5 py-2.5 rounded-2xl border flex flex-col justify-center ${
                linguistics.radioTestPassed
                  ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
                  : "bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
              }`}
            >
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-0.5">
                <Mic className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                <span className="truncate">{t("radioTest")}</span>
              </span>
              <span
                className={`font-bold truncate ${
                  linguistics.radioTestPassed
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                }`}
                title={getRadioReasonLabel()}
              >
                {getRadioReasonLabel()}
              </span>
            </div>

            <div className="w-full min-w-0 px-3.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex flex-col justify-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                {t("globalCheck")}
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate" title={getGlobalCheckLabel()}>
                {getGlobalCheckLabel()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          onClick={() => onSelectStatusFilter("all")}
          className={`flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all ${
            statusFilter === "all"
              ? "bg-indigo-50 border-indigo-400 dark:bg-indigo-950/50 dark:border-indigo-600 shadow-sm"
              : "bg-white dark:bg-slate-900 border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {t("totalChecked")}
            </span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">
            {totalCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("activeTargets")}
          </span>
        </button>

        <button
          onClick={() => onSelectStatusFilter("available")}
          className={`flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all ${
            statusFilter === "available"
              ? "bg-emerald-100/70 border-emerald-500 dark:bg-emerald-950/60 dark:border-emerald-600 shadow-sm"
              : "bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 border-emerald-300/80 hover:border-emerald-400 dark:border-emerald-900/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {t("statusAvailable")}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-emerald-700 dark:text-emerald-300 mt-1">
            {availableCount}
          </span>
          <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-0.5 font-medium">
            {t("readyToClaim")}
          </span>
        </button>

        <button
          onClick={() => onSelectStatusFilter("taken")}
          className={`flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all ${
            statusFilter === "taken"
              ? "bg-rose-100/70 border-rose-500 dark:bg-rose-950/60 dark:border-rose-600 shadow-sm"
              : "bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-950/20 dark:hover:bg-rose-950/30 border-rose-300/80 hover:border-rose-400 dark:border-rose-900/60 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-rose-700 dark:text-rose-400">
              {t("statusTaken")}
            </span>
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-rose-700 dark:text-rose-300 mt-1">
            {takenCount}
          </span>
          <span className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 font-medium">
            {t("registeredClaimed")}
          </span>
        </button>

        <button
          onClick={() => onSelectStatusFilter("unknown")}
          className={`flex flex-col p-3.5 sm:p-4 rounded-2xl border-2 text-left transition-all ${
            statusFilter === "unknown"
              ? "bg-amber-100/70 border-amber-500 dark:bg-amber-950/60 dark:border-amber-600 shadow-sm"
              : "bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 border-slate-300 hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 shadow-xs"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-400">
              {t("statusError")}
            </span>
            <AlertCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-200 mt-1">
            {unknownCount}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            {t("checkManually")}
          </span>
        </button>
      </div>

      {/* Control Toolbar Panel: Edge-to-Edge with Zero Empty Space */}
      <div className="p-3 sm:p-3.5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs space-y-2.5 print:hidden shadow-2xs w-full">
        {/* Row 1: Full-Width Responsive Category Segmented Grid (Edge to Edge) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1 w-full p-1 rounded-xl bg-slate-200/80 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60">
          {categories.map((cat) => {
            const isWiki = cat === "Wikipedia";
            const isTrademark = cat === "Trademark";
            const isSelected = selectedCategory === cat;

            return (
              <button
                key={cat}
                onClick={() => onSelectCategory(cat)}
                className={`inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                  isSelected
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                {isWiki && (
                  <Sparkles
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? "text-indigo-500" : "text-slate-400"
                    }`}
                  />
                )}
                {isTrademark && (
                  <Scale
                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                      isSelected ? "text-amber-500" : "text-slate-400"
                    }`}
                  />
                )}
                <span className="truncate">{getCategoryLabel(cat)}</span>
                {isWiki && wikiFound !== undefined && wikiFound !== null && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      wikiFound ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    title={
                      wikiFound
                        ? "Wikipedia page exists"
                        : "No existing Wikipedia page"
                    }
                  />
                )}
                {isTrademark && trademarkRisk && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      trademarkRisk === "High"
                        ? "bg-rose-500"
                        : trademarkRisk === "Medium"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                    title={`Trademark Collision Risk: ${trademarkRisk}`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Row 2: Persona Mode (Left) + Expanded Status Bar (Center) + Actions Suite (Right) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-800/70 w-full">
          {/* Persona Preset Switcher */}
          <div className="inline-flex items-center p-1 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex-shrink-0">
            <button
              type="button"
              onClick={() => onSelectPersonaMode("startup")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                personaMode === "startup"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Startup / Company Mode: Focuses on Domains, Socials, Trademark & Core Cloud/Code"
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>{t("personaStartup")}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectPersonaMode("all")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                personaMode === "all"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="All Targets Mode: Domains, All Socials & All OS/Package Registries"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t("personaAll")}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectPersonaMode("developer")}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                personaMode === "developer"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="DevTool / OS Mode: Highlights Package Registries, Linux Distros, Docker, Hugging Face & GitHub"
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{t("personaDev")}</span>
            </button>
          </div>

          {/* Live Result & Health Pill - Expands to Fill Center with No Gaps */}
          <div className="flex-1 min-w-[240px] flex items-center justify-center">
            <div className="w-full justify-center inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700/60 text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span><strong className="text-emerald-600 dark:text-emerald-400 font-bold">{availableCount} {t("statusAvailable")}</strong> ({t("readyToClaim")})</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-slate-500 dark:text-slate-400">{takenCount} {t("statusTaken")}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>{t("overallScore")}: <strong className="text-indigo-600 dark:text-indigo-400 font-bold">{brandScore}/100</strong></span>
            </div>
          </div>

          {/* Customer Actions Suite */}
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {onOpenChecklist && (
              <button
                type="button"
                onClick={onOpenChecklist}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs border border-emerald-500/80 hover:scale-105 active:scale-95 whitespace-nowrap"
                title="Open step-by-step checklist to claim all available domains, handles & trademarks"
              >
                <Rocket className="w-3.5 h-3.5 text-white" />
                <span>{t("claimChecklist")} ({availableCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleShortlist}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs hover:scale-105 active:scale-95 whitespace-nowrap ${
                isShortlisted
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                  : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 hover:border-amber-400 text-slate-700 dark:text-slate-300"
              }`}
              title="Save this candidate name to compare side-by-side"
            >
              <Star
                className={`w-3.5 h-3.5 ${
                  isShortlisted ? "fill-amber-400 text-amber-500" : "text-amber-500"
                }`}
              />
              <span>{isShortlisted ? t("shortlisted") : t("shortlist")}</span>
            </button>

            {/* Export & Sharing Segmented Toolbar */}
            <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-0.5 shadow-xs divide-x divide-slate-200 dark:divide-slate-800">
              <button
                type="button"
                onClick={handlePrintPdf}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all whitespace-nowrap"
                title="Print or Save as PDF Dossier for Co-Founders / Investors"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>{t("pdfDossier")}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all whitespace-nowrap"
                title="Export availability report as CSV spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                <span>{t("csv")}</span>
              </button>

              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold transition-all whitespace-nowrap"
                title="Copy markdown summary of results"
              >
                {copiedSummary ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t("copySuccess")}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span>{t("copyText")}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {isScoreModalOpen && (
        <ScoreBreakdownModal
          brandName={name}
          brandScore={brandScore}
          verdictLabel={verdictLabel}
          comStatus={comStatus}
          aiStatus={aiStatus}
          ioStatus={ioStatus}
          domains={domains}
          socials={socials}
          packages={packages}
          linguistics={linguistics}
          trademarkRisk={trademarkRisk}
          isOwned={isOwned}
          onToggleOwnership={onToggleOwnership}
          onClose={() => setIsScoreModalOpen(false)}
        />
      )}
    </div>
  );
}
