"use client";

import React, { useState } from "react";
import { ShortlistBrandItem, CheckStatus } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import {
  Star,
  X,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Copy,
  Check,
  Trophy,
  Sparkles,
} from "lucide-react";

interface ShortlistModalProps {
  items: ShortlistBrandItem[];
  onClose: () => void;
  onSelectBrand: (name: string) => void;
  onRemoveBrand: (name: string) => void;
  onClearAll: () => void;
}

function renderStatusPill(status: CheckStatus, label: string) {
  if (status === "available") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-mono text-xs font-bold border border-emerald-300 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }
  if (status === "taken") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100/80 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-mono text-xs font-semibold border border-rose-200 dark:border-rose-900/60 line-through opacity-75">
        <XCircle className="w-3 h-3" />
        <span>{label}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono text-xs">
      <AlertCircle className="w-3 h-3" />
      <span>{label}</span>
    </span>
  );
}

export function ShortlistModal({
  items,
  onClose,
  onSelectBrand,
  onRemoveBrand,
  onClearAll,
}: ShortlistModalProps) {
  const { t } = useLanguage();
  const [copiedComparison, setCopiedComparison] = useState(false);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  // Sort by highest Brandability Score first
  const sortedItems = [...items].sort((a, b) => b.score - a.score);
  const topCandidate = sortedItems[0];

  const handleCopyShareLink = async () => {
    if (sortedItems.length === 0) return;
    const names = sortedItems.map((i) => i.name).join(",");
    const url = `${window.location.origin}/?compare=${encodeURIComponent(names)}`;
    await navigator.clipboard.writeText(url);
    setCopiedShareLink(true);
    setTimeout(() => setCopiedShareLink(false), 2000);
  };

  const handleCopyComparison = async () => {
    if (sortedItems.length === 0) return;
    const lines = [
      "PulsarCheck Candidate Comparison Matrix",
      "======================================",
      ...sortedItems.map(
        (item, idx) =>
          `${idx + 1}. ${item.name.toUpperCase()} — Brandability Score: ${item.score}/100 | .com: ${item.comStatus.toUpperCase()} | .ai: ${item.aiStatus.toUpperCase()} | .io: ${item.ioStatus.toUpperCase()} | Domains: ${item.domainsAvailable}/${item.domainsTotal} | Socials: ${item.socialsAvailable}/${item.socialsTotal} | Packages: ${item.packagesAvailable}/${item.packagesTotal}`
      ),
    ];
    await navigator.clipboard.writeText(lines.join("\n"));
    setCopiedComparison(true);
    setTimeout(() => setCopiedComparison(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 flex-shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-500 shadow-xs flex-shrink-0">
              <Star className="w-6 h-6 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Brand Shortlist &amp; Comparison Matrix
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {items.length} Saved Candidate{items.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Compare your shortlisted company names side-by-side by Brandability Score, .com/.ai availability, and social reach.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {sortedItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Star className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-base text-slate-800 dark:text-slate-200">
              Your Brand Shortlist is Empty
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Search any candidate company name and click the <strong>&ldquo;Save to Shortlist&rdquo;</strong> button to compare your top choices side-by-side.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Top Winner Callout */}
            {topCandidate && sortedItems.length > 1 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-emerald-500/10 to-amber-500/10 border-2 border-emerald-400/60 dark:border-emerald-700/60 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Trophy className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block">
                      Highest Brandability Winner
                    </span>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      &ldquo;{topCandidate.name}&rdquo; leads with a {topCandidate.score}% Brandability Score
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    onSelectBrand(topCandidate.name);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
                >
                  <span>{t("inspectWinner")}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Comparison Table */}
            <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 dark:border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4">{t("candidateName")}</th>
                    <th className="py-3.5 px-4">{t("brandScoreCol")}</th>
                    <th className="py-3.5 px-4">Key TLDs (.com / .ai / .io)</th>
                    <th className="py-3.5 px-4">{t("catDomains")}</th>
                    <th className="py-3.5 px-4">{t("catSocials")}</th>
                    <th className="py-3.5 px-4">{t("catPackages")}</th>
                    <th className="py-3.5 px-4 text-right">{t("actionsCol")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs sm:text-sm">
                  {sortedItems.map((item, index) => (
                    <tr
                      key={item.name}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-black text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          {index === 0 && sortedItems.length > 1 && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                          )}
                          <span>{item.name}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black ${
                              item.score >= 75
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                : item.score >= 50
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300"
                            }`}
                          >
                            {item.score}%
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderStatusPill(item.comStatus, ".com")}
                          {renderStatusPill(item.aiStatus, ".ai")}
                          {renderStatusPill(item.ioStatus, ".io")}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.domainsAvailable}/{item.domainsTotal}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.socialsAvailable}/{item.socialsTotal}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                        {item.packagesAvailable}/{item.packagesTotal}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onSelectBrand(item.name);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                          >
                            Load
                          </button>
                          <button
                            onClick={() => onRemoveBrand(item.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                            title={`Remove ${item.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer Controls */}
            <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={onClearAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{t("clearShortlist")}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-300 dark:border-indigo-800 hover:border-indigo-500 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all"
                  title="Copy a direct link that opens this exact comparison matrix for your co-founders"
                >
                  {copiedShareLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t("copiedExtract")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t("copyShareableUrl")}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleCopyComparison}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all"
                >
                  {copiedComparison ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t("copied")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t("copySummaryText")}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  {t("doneBtn")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
