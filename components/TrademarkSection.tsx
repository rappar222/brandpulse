"use client";

import React, { useState } from "react";
import { TrademarkCheckResult, TrademarkConflictItem } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Building2,
  Smartphone,
  Landmark,
  Loader2,
  Copy,
  Check,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface TrademarkSectionProps {
  name: string;
  trademarkData: TrademarkCheckResult | null;
  isLoading: boolean;
  isOwned?: boolean;
  onToggleOwnership?: () => void;
}

export function TrademarkSection({
  name,
  trademarkData,
  isLoading,
  isOwned = false,
  onToggleOwnership,
}: TrademarkSectionProps) {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const handleCopyBrand = () => {
    navigator.clipboard.writeText(name);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const getSourceLabel = (source: string) => {
    const s = (source || "").toLowerCase();
    if (s.includes("corporate directory")) return t("srcCorporateDirectory");
    if (s.includes("romanian commercial")) return t("srcRomanianEntity");
    if (s.includes("uk commercial")) return t("srcUkEntity");
    if (s.includes("german commercial")) return t("srcGermanEntity");
    if (s.includes("eu commercial")) return t("srcEuEntity");
    if (s.includes("commercial entity")) return t("srcCommercialEntity");
    if (s.includes("app store")) return t("srcAppStore");
    if (s.includes("global brand") || s.includes("wikidata")) return t("srcGlobalBrandRegistry");
    return source;
  };

  const getConflictDescription = (item: TrademarkConflictItem) => {
    const desc = item.description || "";
    if (desc.includes("Potential Class 35/42 business name conflict") || desc.includes("Active commercial entity operating at")) {
      const match = desc.match(/operating at\s+([^\s.]+[\.[^\s.]+]+)/i);
      const dom = match ? match[1].replace(/[.,]+$/, "") : item.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return t("descPotentialClassConflict").replace("{domain}", dom);
    }
    if (desc.includes("Active commercial business operating on")) {
      const match = desc.match(/operating on\s+([^\s.]+[\.[^\s.]+]+)/i);
      const dom = match ? match[1].replace(/[.,]+$/, "") : item.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
      return t("descActiveCommercialOperating").replace("{domain}", dom);
    }
    return desc;
  };

  const getTranslatedRiskSummary = (summary: string) => {
    if (!summary) return "";
    if (summary.includes("Active commercial business") && summary.includes("is actively operating on")) {
      const nameMatch = summary.match(/Active commercial business "([^"]+)"/i);
      const domMatch = summary.match(/operating on\s+([^\s.]+[\.[^\s.]+]+)/i);
      const compName = nameMatch ? nameMatch[1] : name;
      const dom = domMatch ? domMatch[1].replace(/[.,]+$/, "") : `${name.toLowerCase()}.com`;
      return t("riskActiveBusinessOperating")
        .replace("{name}", compName)
        .replace("{domain}", dom);
    }
    if (summary.includes("Active commercial entities or published software products already operate under")) {
      return t("riskActiveEntitiesOperateUnder").replace("{name}", name);
    }
    if (summary.includes("related commercial or software entity match")) {
      const countMatch = summary.match(/Found\s+(\d+)\s+related/i);
      const count = countMatch ? countMatch[1] : String(trademarkData?.conflicts.length || 1);
      return t("riskModerateMatchesFound").replace("{count}", count).replace("{name}", name);
    }
    if (summary.includes("No exact commercial or software brand collisions were detected")) {
      return t("riskNoCollisionsDetected").replace("{name}", name);
    }
    return summary;
  };

  return (
    <section className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-200/70 dark:border-amber-800/70 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-2xs">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                {t("trademarkTitle")}
              </h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                {t("trademarkScreening")}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("trademarkDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && !trademarkData && (
        <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-8 flex flex-col items-center justify-center text-center space-y-3 shadow-xs">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
          <div className="space-y-1">
            <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">
              Scanning Corporate Directories &amp; Brand Registries for &ldquo;{name}&rdquo;...
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Checking active corporations, Class 9/42 software titles, and global entity databases.
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {(!isLoading || Boolean(trademarkData)) && trademarkData && (
        <div className="rounded-3xl border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-5 sm:p-6 space-y-6 shadow-xs">
          {/* Verified Ownership State or Risk Banner */}
          {isOwned ? (
            <div className="p-4 sm:p-5 rounded-2xl border-2 bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center text-emerald-700 dark:text-emerald-300 flex-shrink-0 mt-0.5">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm sm:text-base text-emerald-900 dark:text-emerald-200">
                      Verified Ownership Declared • Trademark Warnings Dismissed
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                      Ownership Active
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                    You confirmed that you own or officially represent &ldquo;{name}&rdquo;. Collision warnings, trademark risk flags, and brandability deductions have been muted for this entity.
                  </p>
                </div>
              </div>

              {onToggleOwnership && (
                <button
                  type="button"
                  onClick={onToggleOwnership}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-slate-800 text-xs font-bold self-start sm:self-center flex-shrink-0 transition-colors shadow-2xs"
                  title="Re-enable trademark warnings for this name"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo / Re-enable warnings</span>
                </button>
              )}
            </div>
          ) : (
            <div
              className={`p-4 rounded-2xl border-2 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                trademarkData.riskLevel === "High"
                  ? "bg-rose-50/70 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/80 text-rose-900 dark:text-rose-200"
                  : trademarkData.riskLevel === "Medium"
                  ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/80 text-amber-900 dark:text-amber-200"
                  : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-900/80 text-emerald-900 dark:text-emerald-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex-shrink-0">
                  {trademarkData.riskLevel === "High" ? (
                    <ShieldAlert className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                  ) : trademarkData.riskLevel === "Medium" ? (
                    <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm sm:text-base">
                      {t("trademarkCollisionRiskLabel")}{" "}
                      {trademarkData.riskLevel === "High"
                        ? t("riskHigh")
                        : trademarkData.riskLevel === "Medium"
                        ? t("riskMedium")
                        : t("riskLow")}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        trademarkData.riskLevel === "High"
                          ? "bg-rose-600 text-white"
                          : trademarkData.riskLevel === "Medium"
                          ? "bg-amber-600 text-white"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {trademarkData.conflicts.length}{" "}
                      {trademarkData.conflicts.length === 1
                        ? t("activeMatch")
                        : t("activeMatches")}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {getTranslatedRiskSummary(trademarkData.riskSummary)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap self-start lg:self-center flex-shrink-0">
                {onToggleOwnership && (
                  <button
                    type="button"
                    onClick={onToggleOwnership}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition-all hover:scale-105 active:scale-95 border border-emerald-500"
                    title="Dismiss trademark warnings if you own this company"
                  >
                    <ShieldCheck className="w-4 h-4 text-white flex-shrink-0" />
                    <span className="text-white">{t("iOwnThisCompany")}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleCopyBrand}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs hover:scale-105 transition-transform"
                  title="Copy brand name for pasting into USPTO / UKIPO"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Copied &ldquo;{name}&rdquo;</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t("copyBrandForFiling")}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Detected Commercial / Software Collisions */}
          {trademarkData.conflicts.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("detectedCommercial")} &ldquo;{name}&rdquo;
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {trademarkData.conflicts.map((item, i) => (
                  <a
                    key={`${item.title}-${i}`}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/70 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                          {item.type === "Corporate Entity" ? (
                            <Building2 className="w-3 h-3" />
                          ) : item.type === "Software / App" ? (
                            <Smartphone className="w-3 h-3" />
                          ) : (
                            <Landmark className="w-3 h-3" />
                          )}
                          <span>{getSourceLabel(item.source)}</span>
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors" />
                      </div>
                      <h5 className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {item.title}
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                        {getConflictDescription(item)}
                      </p>

                      {item.companyInfo && (
                        <div className="pt-2 mt-2 border-t border-slate-200/80 dark:border-slate-700/60 flex flex-wrap gap-1.5 text-[11px]">
                          {item.companyInfo.legalName && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              <span>{t("legalLabel")} {item.companyInfo.legalName}</span>
                            </span>
                          )}
                          {item.companyInfo.foundingDate && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              <span>{t("foundedLabel")} {item.companyInfo.foundingDate}</span>
                            </span>
                          )}
                          {(item.companyInfo.vatID || item.companyInfo.taxID) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[10px] border border-slate-200 dark:border-slate-700">
                              <span>🆔 {item.companyInfo.vatID || item.companyInfo.taxID}</span>
                            </span>
                          )}
                          {item.companyInfo.address && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 truncate max-w-full" title={item.companyInfo.address}>
                              <span>📍 {item.companyInfo.address}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Official Government Trademark & Corporate Registries */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t("officialRegistriesTitle")}
              </h4>
              <span className="text-[11px] text-slate-400">
                {t("officialRegistriesSubtitle")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {trademarkData.officialDirectories.map((dir) => {
                const getDirDesc = (id: string, nameParam: string) => {
                  if (id === "uspto") return t("usptoDesc").replace("{name}", nameParam);
                  if (id === "euipo") return t("euipoDesc").replace("{name}", nameParam);
                  if (id === "wipo") return t("wipoDesc");
                  if (id === "ukipo") return t("ukIpoDesc");
                  if (id === "opencorporates") return t("openCorpDesc");
                  return dir.description;
                };

                return (
                  <a
                    key={dir.id}
                    href={dir.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group p-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-900 hover:shadow-sm transition-all flex flex-col justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                        <span>{dir.region}</span>
                        <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                      </div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {dir.name}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {getDirDesc(dir.id, name)}
                      </p>
                    </div>
                  </a>
                );
              })}
            </div>
          </div>

          {/* Mobile App Stores & Software Marketplaces */}
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t("appStoreMarketplaceTitle")}
                </h4>
              </div>
              <span className="text-[11px] text-slate-400">
                {t("appStoreMarketplaceSubtitle")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {[
                {
                  id: "ios",
                  badge: t("badgeApple"),
                  title: "Apple App Store",
                  desc: t("appleStoreDesc").replace("{name}", name),
                  url: `https://www.google.com/search?q=${encodeURIComponent(
                    `site:apps.apple.com "${name}"`
                  )}`,
                },
                {
                  id: "gplay",
                  badge: t("badgeAndroid"),
                  title: "Google Play Store",
                  desc: t("googlePlayDesc").replace("{name}", name),
                  url: `https://play.google.com/store/search?q=${encodeURIComponent(
                    name
                  )}&c=apps`,
                },
                {
                  id: "chrome",
                  badge: t("badgeChrome"),
                  title: "Chrome Web Store",
                  desc: t("chromeWebStoreDesc").replace("{name}", name),
                  url: `https://chromewebstore.google.com/search/${encodeURIComponent(
                    name
                  )}`,
                },
                {
                  id: "steam",
                  badge: t("badgeDesktop"),
                  title: "Product Hunt & Steam",
                  desc: t("productHuntSteamDesc").replace("{name}", name),
                  url: `https://www.google.com/search?q=${encodeURIComponent(
                    `(site:producthunt.com/products OR site:store.steampowered.com) "${name}"`
                  )}`,
                },
              ].map((store) => (
                <a
                  key={store.id}
                  href={store.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group p-3 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-white dark:hover:bg-slate-800 transition-all flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400">
                    <span>{store.badge}</span>
                    <ExternalLink className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {store.title}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {store.desc}
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
