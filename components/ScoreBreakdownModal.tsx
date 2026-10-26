"use client";

import React, { useEffect } from "react";
import { CheckResult, CheckStatus } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import {
  X,
  Award,
  Globe,
  Share2,
  Package,
  Scale,
  Mic,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Info,
  Sparkles,
} from "lucide-react";

interface ScoreBreakdownModalProps {
  brandName: string;
  brandScore: number;
  verdictLabel: string;
  comStatus: CheckStatus;
  aiStatus: CheckStatus;
  ioStatus: CheckStatus;
  domains: CheckResult[];
  socials: CheckResult[];
  packages: CheckResult[];
  linguistics: {
    length: number;
    syllables: number;
    lengthVerdict: string;
    radioTestPassed: boolean;
    radioReason: string;
    globalCheck: string;
  };
  trademarkRisk?: "High" | "Medium" | "Low" | null;
  isOwned: boolean;
  onToggleOwnership?: () => void;
  onClose: () => void;
}

export function ScoreBreakdownModal({
  brandName,
  brandScore,
  verdictLabel,
  comStatus,
  aiStatus,
  ioStatus,
  domains,
  socials,
  packages,
  linguistics,
  trademarkRisk,
  isOwned,
  onToggleOwnership,
  onClose,
}: ScoreBreakdownModalProps) {
  const { t } = useLanguage();

  // ESC key listener & body scroll lock
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose]);

  // Points breakdown calculation
  const comPts = comStatus === "available" ? 30 : 0;
  const aiPts = aiStatus === "available" ? 10 : 0;
  const ioPts = ioStatus === "available" ? 10 : 0;

  const domAvail = domains.filter((r) => r.status === "available").length;
  const socAvail = socials.filter((r) => r.status === "available").length;
  const pkgAvail = packages.filter((r) => r.status === "available").length;

  const fleetPts = domains.length > 0 ? Math.round((domAvail / domains.length) * 15) : 0;
  const socPts = socials.length > 0 ? Math.round((socAvail / socials.length) * 25) : 0;
  const pkgPts = packages.length > 0 ? Math.round((pkgAvail / packages.length) * 10) : 0;

  const trademarkPenalty =
    isOwned
      ? 0
      : trademarkRisk === "High"
      ? -20
      : trademarkRisk === "Medium"
      ? -8
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fadeIn">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border-t-2 sm:border-2 border-slate-300 dark:border-slate-800 shadow-2xl p-4 sm:p-7 space-y-4 sm:space-y-6 z-10 modal-sheet">
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 flex-shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 flex-shrink-0 shadow-2xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {t("whyThisScore")}
                </h3>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {t("mathematicalBreakdown")}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("scoreAuditFor")} &ldquo;{brandName}&rdquo;
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`${t("closeModal")} (Esc)`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total Score & Executive Verdict Banner */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            brandScore >= 75 && (isOwned || trademarkRisk !== "High")
              ? "bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 text-emerald-950 dark:text-emerald-200"
              : brandScore >= 45 && (isOwned || trademarkRisk !== "High")
              ? "bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 text-amber-950 dark:text-amber-200"
              : "bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 text-rose-950 dark:text-rose-200"
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-900 border-2 border-current flex flex-col items-center justify-center font-black flex-shrink-0 shadow-xs">
              <span className="text-2xl leading-none">{brandScore}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-75 mt-0.5">
                / 100
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider opacity-75 block">
                {t("executiveLaunchVerdict")}
              </span>
              <div className="font-black text-base sm:text-lg tracking-tight">
                {verdictLabel}
              </div>
              <p className="text-xs opacity-90 leading-relaxed max-w-md">
                {brandScore >= 75
                  ? "Top-tier naming candidate. Clean domain real estate, strong social namespace, and high phonetic clarity."
                  : brandScore >= 45
                  ? "Viable brand candidate, but key assets may be unavailable. Prefixes (e.g. get-, try-) or modifiers are recommended."
                  : "Elevated namespace friction. Core domains are taken or commercial entity collisions are detected."}
              </p>
            </div>
          </div>
        </div>

        {/* 6 Component Factors Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>{t("scoreFactorsPoints")}</span>
            <span>{t("earnedPoints")}</span>
          </div>

          {/* Factor 1: Anchor TLDs */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  {t("anchorTlds")}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                +{comPts + aiPts + ioPts} / 50 pts
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-xs font-mono">
              <div
                className={`p-2 rounded-xl border flex items-center justify-between ${
                  comStatus === "available"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span>.com</span>
                <span className="font-bold">{comStatus === "available" ? "+30" : "0"}</span>
              </div>

              <div
                className={`p-2 rounded-xl border flex items-center justify-between ${
                  aiStatus === "available"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span>.ai</span>
                <span className="font-bold">{aiStatus === "available" ? "+10" : "0"}</span>
              </div>

              <div
                className={`p-2 rounded-xl border flex items-center justify-between ${
                  ioStatus === "available"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                <span>.io</span>
                <span className="font-bold">{ioStatus === "available" ? "+10" : "0"}</span>
              </div>
            </div>
          </div>

          {/* Factor 2: Fleet TLDs */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-500" />
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  Domain Fleet Coverage (Max 15 pts)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {domAvail} of {domains.length} scanned extensions available
              </p>
            </div>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
              +{fleetPts} / 15 pts
            </span>
          </div>

          {/* Factor 3: Social Media Handles */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-500" />
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  Social Namespace &amp; Handle Freedom (Max 25 pts)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {socAvail} of {socials.length} platform handles free across GitHub, X, LinkedIn, YouTube, TikTok, etc.
              </p>
            </div>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
              +{socPts} / 25 pts
            </span>
          </div>

          {/* Factor 4: Package Registries */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-500" />
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  Package Registries &amp; Developer Tooling (Max 10 pts)
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {pkgAvail} of {packages.length} package managers free (npm, PyPI, Crates, etc.)
              </p>
            </div>
            <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
              +{pkgPts} / 10 pts
            </span>
          </div>

          {/* Factor 5: Trademark Risk & Ownership */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
              isOwned
                ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300"
                : trademarkRisk === "High"
                ? "bg-rose-50/60 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300"
                : trademarkRisk === "Medium"
                ? "bg-amber-50/60 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Scale className="w-4 h-4 flex-shrink-0" />
                <span className="font-extrabold text-xs">
                  Trademark &amp; Commercial Collision Deduction
                </span>
              </div>
              <p className="text-[11px] opacity-90">
                {isOwned
                  ? "✓ Ownership Declared: Trademark penalty waived (+20 pts restored because you own this entity)"
                  : trademarkRisk === "High"
                  ? "High collision: Active commercial entity or registered trademark match detected"
                  : trademarkRisk === "Medium"
                  ? "Medium collision: Potential software or regional overlap detected"
                  : "Clean trademark & commercial namespace screening"}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="text-xs font-mono font-black">
                {trademarkPenalty} pts
              </span>
              {!isOwned && trademarkRisk && trademarkRisk !== "Low" && onToggleOwnership && (
                <button
                  type="button"
                  onClick={onToggleOwnership}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold hover:scale-105 transition-transform shadow-2xs border border-emerald-500"
                  title="Mark this brand as owned by you to waive this penalty"
                >
                  I own this company
                </button>
              )}
            </div>
          </div>

          {/* Factor 6: Linguistic Radio Test */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-500" />
                <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                  Phonetic Radio Test &amp; Memorability
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                {linguistics.length} chars • {linguistics.syllables} syllable
                {linguistics.syllables === 1 ? "" : "s"} ({linguistics.lengthVerdict}) • {linguistics.radioReason}
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {linguistics.radioTestPassed ? "Passed" : "Caution"}
            </span>
          </div>
        </div>

        {/* Actionable Tips */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>How to Maximize Your Brand Score</span>
          </div>
          <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-disc pl-4">
            {comStatus !== "available" && (
              <li>
                <strong>Anchor Domain:</strong> Secure `.com` or use prefix modifiers (e.g., <code>get{brandName.toLowerCase()}.com</code> or <code>use{brandName.toLowerCase()}.com</code>) to claim top-tier branding authority.
              </li>
            )}
            {socAvail < socials.length && (
              <li>
                <strong>Social Handles:</strong> Claim remaining usernames immediately on GitHub, X, LinkedIn, and YouTube to protect your namespace.
              </li>
            )}
            {trademarkRisk && trademarkRisk !== "Low" && !isOwned && (
              <li>
                <strong>Trademark Clearance:</strong> If you already own this trademark or registered corporation, click <em>&ldquo;I own this company, stop warning me&rdquo;</em> to restore your full score.
              </li>
            )}
          </ul>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors"
          >
            Got it, close
          </button>
        </div>
      </div>
    </div>
  );
}
