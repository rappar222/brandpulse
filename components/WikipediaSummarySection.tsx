"use client";

import React, { useState } from "react";
import { WikiSummaryResult } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import {
  Sparkles,
  ExternalLink,
  BookOpen,
  BookX,
  ShieldAlert,
  ShieldCheck,
  Info,
  Copy,
  Check,
  Loader2,
  Globe,
  Radio,
  Building2,
  AlertCircle,
} from "lucide-react";

interface WikipediaSummarySectionProps {
  name: string;
  wikiData: WikiSummaryResult | null;
  isLoading: boolean;
  onRefresh?: () => void;
}

export function WikipediaSummarySection({
  name,
  wikiData,
  isLoading,
}: WikipediaSummarySectionProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [selectedSiteDomain, setSelectedSiteDomain] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWiki = wikiData?.source === "wikipedia";
  const isWeb = wikiData?.source === "website" && (!!wikiData.websiteSummary || (wikiData.allWebsites && wikiData.allWebsites.length > 0));

  const activeSite =
    (wikiData?.allWebsites && selectedSiteDomain
      ? wikiData.allWebsites.find((s) => s.domain === selectedSiteDomain)
      : null) ||
    wikiData?.websiteSummary ||
    (wikiData?.allWebsites && wikiData.allWebsites[0]) ||
    null;

  return (
    <section className="space-y-4 animate-fadeIn">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl theme-ai-box flex items-center justify-center theme-ai-accent shadow-2xs">
            {isWeb ? <Globe className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {isWeb ? t("webIntelligence") : t("wikiAiSummary")}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full theme-ai-badge">
                <Sparkles className="w-3 h-3 theme-ai-accent" />
                {isWeb ? t("popularTldDiscovery") : t("aiSynthesized")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isWeb
                ? t("noWikiSynthesizedLive")
                : t("wikiRealtimeAnalysis")}
            </p>
          </div>
        </div>

        {isWiki && wikiData?.url && (
          <a
            href={wikiData.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-slate-700 bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-2xs hover:shadow-xs transition-all self-start sm:self-auto"
          >
            <span>{t("viewArticle")}</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500" />
          </a>
        )}
      </div>

      {/* Loading State */}
      {isLoading && !wikiData && (
        <div className="p-8 sm:p-12 rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl theme-ai-box flex items-center justify-center theme-ai-accent">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {t("queryingKnowledgeGraph")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
              {t("scanningTldHierarchy").replace("{name}", name)}
            </p>
          </div>
        </div>
      )}

      {/* Mode 1: Wikipedia Page Found */}
      {(!isLoading || Boolean(wikiData)) && isWiki && wikiData && (
        <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden space-y-6 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {wikiData.thumbnail ? (
                <img
                  src={wikiData.thumbnail}
                  alt={wikiData.title}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-slate-200 dark:border-slate-700 shadow-xs flex-shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl theme-ai-box flex items-center justify-center theme-ai-accent font-serif font-black text-2xl flex-shrink-0">
                  W
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {wikiData.title}
                  </h3>
                  {wikiData.aiSummary?.entityType && (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                      {wikiData.aiSummary.entityType}
                    </span>
                  )}
                </div>
                {wikiData.description && (
                  <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
                    {wikiData.description}
                  </p>
                )}
              </div>
            </div>

            {wikiData.aiSummary?.collisionRisk && (
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start ${
                  wikiData.aiSummary.collisionRisk === "High"
                    ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    : wikiData.aiSummary.collisionRisk === "Moderate"
                    ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                    : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{wikiData.aiSummary.collisionRisk} Collision Risk</span>
              </div>
            )}
          </div>

          {wikiData.aiSummary && (
            <div className="p-5 rounded-2xl theme-ai-box space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold theme-ai-text uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 theme-ai-accent" />
                  <span>{t("aiExecutiveBriefing")}</span>
                </div>
                <span className="text-[10px] theme-ai-accent font-mono opacity-80">
                  {t("synthesizedFromWiki")}
                </span>
              </div>

              <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                {wikiData.aiSummary.keyPoints.map((point, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="theme-ai-accent font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              {wikiData.aiSummary.collisionNote && (
                <div className="pt-2 border-t theme-ai-divider flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                  <Info className="w-3.5 h-3.5 theme-ai-accent flex-shrink-0 mt-0.5" />
                  <span>{wikiData.aiSummary.collisionNote}</span>
                </div>
              )}
            </div>
          )}

          {wikiData.extract && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t("wikiLeadExtract")}
              </span>
              <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
                "{wikiData.extract}"
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() => handleCopy(`Wikipedia Summary for "${wikiData.title}":\n${wikiData.extract}\nSource: ${wikiData.url}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("copiedExtract")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("copyExtract")}</span>
                </>
              )}
            </button>

            {wikiData.url && (
              <a
                href={wikiData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs"
              >
                <span>{t("readFullWiki")}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Mode 2: No Wikipedia Article, BUT Active TLD Website(s) Found */}
      {(!isLoading || Boolean(wikiData)) && isWeb && activeSite && (
        <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs overflow-hidden space-y-6 p-6 sm:p-8">
          {/* Wikipedia Status Notice + Found Domain Announcement */}
          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-medium">
              <BookX className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                {t("noWikiScannedTld")}{" "}
                <strong>{activeSite.domain}</strong>.
              </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {activeSite.tier && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md theme-ai-badge font-semibold text-[10px]">
                  {activeSite.tier === "Requested / Custom TLD"
                    ? t("requestedCustomTld")
                    : activeSite.tier === "Popular TLD"
                    ? t("popularTld")
                    : activeSite.tier}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-200/60 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-mono text-[10px] font-bold self-start sm:self-auto">
                .{activeSite.tld.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Site Selector Bar when multiple sites found */}
          {wikiData.allWebsites && wikiData.allWebsites.length > 1 && (
            <div className="p-4 rounded-2xl bg-slate-100/80 dark:bg-slate-800/60 border-2 border-slate-300 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{t("discoveredSitesCount").replace("{count}", String(wikiData.allWebsites.length))}</span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("selectDomainAiProfile")}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {wikiData.allWebsites.map((site) => {
                  const isCurrent = activeSite.domain === site.domain;
                  return (
                    <button
                      key={site.domain}
                      type="button"
                      onClick={() => setSelectedSiteDomain(site.domain)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isCurrent
                          ? "bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/30 scale-[1.02]"
                          : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-slate-600"
                      }`}
                    >
                      <Globe className={`w-3.5 h-3.5 ${isCurrent ? "text-white" : "text-indigo-500"}`} />
                      <span>{site.domain}</span>
                      {site.isUnknown ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 shadow-2xs">
                          {t("unknownStatus")}
                        </span>
                      ) : site.isParked ? (
                        <span className="text-[9px] px-1 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
                          {t("parkedStatus")}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Website Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl theme-ai-box flex items-center justify-center theme-ai-accent flex-shrink-0 shadow-xs">
                <Globe className="w-7 h-7" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    {activeSite.title}
                  </h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                    {activeSite.aiSummary.entityType}
                  </span>
                </div>
                <a
                  href={activeSite.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs theme-ai-text font-mono font-semibold hover:underline"
                  title={`Open https://${activeSite.domain}`}
                >
                  <Radio
                    className={`w-3 h-3 animate-pulse ${
                      activeSite.isUnknown ? "text-rose-500" : "text-emerald-500"
                    }`}
                  />
                  <span>{activeSite.domain}</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </div>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border self-start ${
                activeSite.isUnknown
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                  : activeSite.isParked
                  ? "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
              }`}
            >
              {activeSite.isUnknown ? (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  <span>Unknown (Unaccessible)</span>
                </>
              ) : activeSite.isParked ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t("parkedDomain")}</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{t("liveSite")}</span>
                </>
              )}
            </div>
          </div>

          {/* Verified Corporate & Operating Entity Intelligence */}
          {activeSite.companyInfo && (
            <div className="p-4 sm:p-5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-indigo-200/50 dark:border-indigo-800/40">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Verified Corporate &amp; Operating Entity</span>
                </div>
                {activeSite.companyInfo.operatingSince && (
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border border-indigo-300 dark:border-indigo-700">
                    Active Since {activeSite.companyInfo.operatingSince}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                {activeSite.companyInfo.legalName && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      Registered Legal Name
                    </span>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {activeSite.companyInfo.legalName}
                    </p>
                  </div>
                )}
                {activeSite.companyInfo.brandName && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      Brand / Trade Name
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeSite.companyInfo.brandName}
                    </p>
                  </div>
                )}
                {(activeSite.companyInfo.vatID || activeSite.companyInfo.taxID) && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      Fiscal / VAT Identifier
                    </span>
                    <p className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {activeSite.companyInfo.vatID || activeSite.companyInfo.taxID}
                    </p>
                  </div>
                )}
                {activeSite.companyInfo.address && (
                  <div className="space-y-0.5 sm:col-span-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      Registered Physical Location
                    </span>
                    <p className="text-slate-700 dark:text-slate-300">
                      📍 {activeSite.companyInfo.address}
                    </p>
                  </div>
                )}
                {activeSite.companyInfo.email && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500">
                      Corporate Contact
                    </span>
                    <p className="font-mono text-slate-700 dark:text-slate-300">
                      ✉️ {activeSite.companyInfo.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Executive Briefing of what's on that site */}
          <div className="p-5 rounded-2xl theme-ai-box space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b theme-ai-divider">
              <div className="flex items-center gap-2 text-xs font-bold theme-ai-text uppercase tracking-wider">
                <Sparkles className="w-4 h-4 theme-ai-accent" />
                <span>{t("aiWebsiteSummaryTitle")}</span>
              </div>
              <a
                href={activeSite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-2 border-indigo-300 dark:border-indigo-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-slate-800 shadow-2xs hover:shadow-xs transition-all self-start sm:self-auto group"
                title={`${t("visitDomain")} ${activeSite.domain}`}
              >
                <Globe className="w-3.5 h-3.5 text-indigo-500 group-hover:scale-110 transition-transform" />
                <span>{t("visitDomain")} {activeSite.domain}</span>
                <ExternalLink className="w-3 h-3 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            </div>

            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
              {activeSite.aiSummary.siteSummary}
            </p>

            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 pt-1">
              {activeSite.aiSummary.keyPoints.map((point, idx) => {
                let displayPoint = point;
                if (point.startsWith("Site Title:")) {
                  displayPoint = `${t("siteTitleLabel")} ${point.slice("Site Title:".length).trim()}`;
                } else if (point.startsWith("Main Headline:")) {
                  displayPoint = `${t("mainHeadlineLabel")} ${point.slice("Main Headline:".length).trim()}`;
                } else if (point.startsWith("Lead Extract:")) {
                  displayPoint = `${t("leadExtractLabel")} ${point.slice("Lead Extract:".length).trim()}`;
                } else if (point.startsWith("Core Proposition:")) {
                  displayPoint = `${t("corePropositionLabel")} ${point.slice("Core Proposition:".length).trim()}`;
                }
                return (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="theme-ai-accent font-bold">•</span>
                    <span>{displayPoint}</span>
                  </li>
                );
              })}
            </ul>

            <div className="pt-2.5 border-t theme-ai-divider flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <div className="flex items-start gap-2">
                <Info className="w-3.5 h-3.5 theme-ai-accent flex-shrink-0 mt-0.5" />
                <span>
                  {activeSite.aiSummary.statusNote.includes("Brand presence is claimed")
                    ? `${t("activeSiteOperatingOn")} ${activeSite.domain}. ${t("brandPresenceClaimed")}`
                    : activeSite.aiSummary.statusNote}
                </span>
              </div>
              <a
                href={activeSite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold theme-ai-text hover:underline flex-shrink-0 self-start sm:self-auto"
              >
                <span>{t("goToDomain")} {activeSite.domain}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={() =>
                handleCopy(
                  `Website Summary for "${activeSite.domain}":\n${activeSite.title}\n${activeSite.description}\nURL: ${activeSite.url}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>{t("copiedSummary")}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>{t("copySummary")}</span>
                </>
              )}
            </button>

            <a
              href={activeSite.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors shadow-2xs"
            >
              <span>{t("visit")} {activeSite.domain}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* Mode 3: Neither Wikipedia NOR any popular TLD website found */}
      {!isLoading && !isWiki && !isWeb && (
        <div className="p-8 sm:p-10 rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center text-slate-500 dark:text-slate-400 flex-shrink-0">
                <BookX className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                  {t("noExistingWiki")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t("targetSearchQuery")} <span className="font-mono font-semibold theme-ai-text">"{name}"</span>
                </p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("availableMark")}</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
              <Sparkles className="w-4 h-4 theme-ai-accent" />
              <span>{t("fullSpectrumAnalysis")}</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {t("noWikiNoSitesDetected")}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <a
              href={`https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold theme-ai-text hover:underline"
            >
              <span>{t("verifyManuallyWiki")}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
