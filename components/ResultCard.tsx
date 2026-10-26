"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { CheckResult } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import {
  ExternalLink,
  Globe,
  Package,
  Github,
  Twitter,
  MessageSquare,
  Copy,
  Check,
  Cpu,
  Tag,
  ArrowRight,
  Server,
} from "lucide-react";

import { PlatformLogo } from "./PlatformLogo";
import { getDomainTld, getRegistrarsForTld } from "@/lib/registrars";
import { useIsPhone } from "@/lib/useIsPhone";
import { useLanguage } from "@/lib/i18n";

interface BasicWhoisData {
  registrar?: string;
  registeredDate?: string;
  expiryDate?: string;
  nameservers?: string[];
  country?: string;
  ip?: string;
  loaded: boolean;
}

const whoisCache = new Map<string, BasicWhoisData>();

interface ResultCardProps {
  result: CheckResult;
  isChecking?: boolean;
  onOpenHostDetails?: (domain: string) => void;
}

export function ResultCard({
  result,
  isChecking = false,
  onOpenHostDetails,
}: ResultCardProps) {
  const { t } = useLanguage();
  const isPhone = useIsPhone();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const renderIcon = () => {
    return (
      <div className={`${isPhone ? "w-8 h-8 rounded-lg p-1.5" : "w-10 h-10 rounded-xl p-2"} bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs`}>
        <PlatformLogo platform={result.platform} className={isPhone ? "w-4 h-4" : "w-5 h-5"} />
      </div>
    );
  };

  const domainName = result.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const isAvailableDomain =
    result.category === "Domains" && result.status === "available" && !isChecking;
  const isTakenDomain =
    result.category === "Domains" &&
    (result.status === "taken" || result.status === "unknown") &&
    !isChecking;

  const domainTld = isAvailableDomain ? getDomainTld(domainName) : "";
  const supportedRegistrars = useMemo(() => {
    if (!isAvailableDomain) return [];
    return getRegistrarsForTld(domainTld);
  }, [isAvailableDomain, domainTld]);

  const getTranslatedMessage = (res: CheckResult) => {
    const msg = res.message || "";
    if (!msg) return "";
    if (msg.toLowerCase().includes("unaccessible host")) return t("unaccessibleHostNoWhois");
    if (msg === "Active NS records present") return t("activeNsPresent");
    if (msg === "Domain is registered") return t("domainIsRegistered");
    if (msg.includes("Available (DNS + RDAP)")) return `${t("statusAvailable")} (DNS + RDAP)`;
    if (msg.includes("Registered in WHOIS/RDAP")) return t("domainIsRegistered");
    if (
      msg.toLowerCase().includes("available") ||
      msg.toLowerCase().includes("not found") ||
      msg.toLowerCase().includes("not registered")
    ) {
      return `${res.platform} ${t("handleAvailable")}`;
    }
    if (
      msg.toLowerCase().includes("taken") ||
      msg.toLowerCase().includes("registered") ||
      msg.toLowerCase().includes("exists") ||
      msg.toLowerCase().includes("active") ||
      msg.toLowerCase().includes("published") ||
      msg.toLowerCase().includes("claimed")
    ) {
      return `${res.platform} ${t("handleTaken")}`;
    }
    return msg;
  };

  const [whoisData, setWhoisData] = useState<BasicWhoisData | null>(() => {
    if (!isTakenDomain) return null;
    return whoisCache.get(domainName) || null;
  });
  const [isWhoisLoading, setIsWhoisLoading] = useState<boolean>(() => {
    if (!isTakenDomain) return false;
    return !whoisCache.has(domainName);
  });
  const [isMessageExpanded, setIsMessageExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (!isTakenDomain) return;

    if (whoisCache.has(domainName)) {
      setWhoisData(whoisCache.get(domainName)!);
      setIsWhoisLoading(false);
      return;
    }

    let isMounted = true;
    setIsWhoisLoading(true);

    fetch(`/api/host-details?domain=${encodeURIComponent(domainName)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted) return;
        const parsed: BasicWhoisData = {
          registrar: data?.registrar,
          registeredDate: data?.registeredDate,
          expiryDate: data?.expiryDate,
          nameservers: data?.nameservers,
          country: data?.country,
          ip: data?.ip,
          loaded: true,
        };
        whoisCache.set(domainName, parsed);
        setWhoisData(parsed);
      })
      .catch(() => {
        if (!isMounted) return;
        const empty: BasicWhoisData = { loaded: true };
        whoisCache.set(domainName, empty);
        setWhoisData(empty);
      })
      .finally(() => {
        if (isMounted) setIsWhoisLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [domainName, isTakenDomain]);

  // Clean subtext to display below the platform title (never truncate into 'Package Reg...')
  const displaySubtext = () => {
    if (result.category === "Domains") {
      return domainName;
    }
    if (result.handleTested) {
      return result.handleTested;
    }
    if (result.category === "Package Registries") {
      try {
        const u = new URL(result.url);
        const parts = u.pathname.split("/").filter(Boolean);
        const last = parts[parts.length - 1];
        if (last && !last.includes("?")) return decodeURIComponent(last);
      } catch {
        // ignore
      }
      return "package";
    }
    return result.platform.toLowerCase();
  };

  return (
    <div
      className={`group relative flex flex-col justify-between ${
        isPhone
          ? "rounded-xl p-3 border-2 shadow-2xs"
          : "rounded-2xl p-4 sm:p-5 border-2 shadow-xs hover:shadow-md"
      } border-slate-300/80 hover:border-indigo-400 dark:border-slate-800/90 dark:hover:border-slate-700 bg-white dark:bg-slate-900/90 transition-all duration-200`}
    >
      <div>
        <div className={`flex items-start justify-between gap-2.5 ${isPhone ? "mb-2" : "mb-3"}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {renderIcon()}
            <div className="min-w-0">
              <h4
                className={`font-bold ${
                  isPhone ? "text-sm leading-tight" : "text-base"
                } text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate`}
              >
                {result.platform}
              </h4>
              <p
                className={`${isPhone ? "text-[11px]" : "text-xs"} text-slate-500 dark:text-slate-400 font-mono truncate`}
                title={displaySubtext()}
              >
                {displaySubtext()}
              </p>
            </div>
          </div>

          <StatusBadge
            status={isChecking ? "checking" : result.status}
            latencyMs={result.latencyMs}
            message={result.message}
          />
        </div>

        {result.message && !isChecking && (
          <p
            onClick={() => setIsMessageExpanded((prev) => !prev)}
            className={`${
              isPhone ? "text-[11px]" : "text-xs"
            } text-slate-500 dark:text-slate-400 mt-1 ${
              isMessageExpanded ? "" : "line-clamp-1"
            } italic cursor-pointer hover:text-slate-700 dark:hover:text-slate-300 transition-colors`}
            title="Click to expand / collapse full message"
          >
            {getTranslatedMessage(result)}
          </p>
        )}

        {isAvailableDomain && (
          <div className={`${isPhone ? "mt-2.5 space-y-1.5" : "mt-3.5 space-y-2"}`}>
            <Link
              href={`/offers?domain=${encodeURIComponent(domainName)}&from=${encodeURIComponent(
                domainName.split(".")[0] || ""
              )}`}
              className={`w-full inline-flex items-center justify-center gap-1.5 ${
                isPhone ? "py-1.5 px-2.5 text-xs rounded-lg" : "py-2 px-3 text-xs rounded-xl"
              } bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold shadow-xs hover:shadow transition-all group/btn`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>{t("viewOffersAndDeals")}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
            </Link>

            {/* Direct 1-Click Registrar Buttons (Filtered by verified TLD support) */}
            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
              <div className="grid grid-cols-3 gap-1">
                {supportedRegistrars.length > 0 ? (
                  supportedRegistrars.slice(0, 6).map((reg) => (
                    <a
                      key={reg.id}
                      href={reg.getSearchUrl(domainName)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1 px-1.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 transition-colors truncate"
                      title={`Register ${domainName} directly on ${reg.name} (Verified .${domainTld} provider)`}
                    >
                      <span>{reg.logoEmoji}</span>
                      <span className="truncate">{reg.name.split(" ")[0]}</span>
                    </a>
                  ))
                ) : (
                  <a
                    href={`https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(
                      domainName
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="col-span-3 inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 transition-colors"
                  >
                    <span>🏷️</span>
                    <span>{t("searchOnNamecheap")}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {isTakenDomain && (
          <div
            className={`${
              isPhone ? "mt-2 p-2 rounded-lg text-[10.5px]" : "mt-2.5 p-2 rounded-xl text-[11px]"
            } bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800/80 space-y-1`}
          >
            {isWhoisLoading ? (
              <div className="space-y-1.5 py-0.5 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-16" />
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-24" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-12" />
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded w-20" />
                </div>
              </div>
            ) : whoisData &&
              (whoisData.registrar ||
                whoisData.registeredDate ||
                whoisData.expiryDate ||
                (whoisData.nameservers && whoisData.nameservers.length > 0) ||
                whoisData.country) ? (
              <div className="space-y-0.5">
                {whoisData.registrar && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
                      {t("registrar")}
                    </span>
                    <span
                      className={`font-semibold text-slate-800 dark:text-slate-200 truncate text-right ${
                        isPhone ? "max-w-[130px]" : "max-w-[155px]"
                      }`}
                      title={whoisData.registrar}
                    >
                      {whoisData.registrar}
                    </span>
                  </div>
                )}
                {whoisData.registeredDate && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
                      {t("created")}
                    </span>
                    <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {whoisData.registeredDate}
                    </span>
                  </div>
                )}
                {whoisData.expiryDate && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
                      {t("expires")}
                    </span>
                    <span className="font-mono text-[10px] text-slate-700 dark:text-slate-300">
                      {whoisData.expiryDate}
                    </span>
                  </div>
                )}
                {whoisData.nameservers && whoisData.nameservers.length > 0 && !whoisData.expiryDate && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
                      NS
                    </span>
                    <span
                      className={`font-mono text-[10px] text-slate-700 dark:text-slate-300 truncate ${
                        isPhone ? "max-w-[130px]" : "max-w-[155px]"
                      }`}
                      title={whoisData.nameservers.join(", ")}
                    >
                      {whoisData.nameservers[0]}
                    </span>
                  </div>
                )}
                {whoisData.country && !whoisData.registeredDate && !whoisData.expiryDate && (
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="text-slate-400 dark:text-slate-500 text-[10px] font-semibold uppercase tracking-wider flex-shrink-0">
                      Host
                    </span>
                    <span
                      className={`text-slate-700 dark:text-slate-300 truncate ${
                        isPhone ? "max-w-[130px]" : "max-w-[155px]"
                      }`}
                    >
                      {whoisData.country}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 text-[10px]">
                <span className="uppercase font-semibold tracking-wider">WHOIS</span>
                <span className="italic">{t("protectedPrivate")}</span>
              </div>
            )}
          </div>
        )}

        {isTakenDomain && onOpenHostDetails && (
          <div className={`${isPhone ? "mt-2" : "mt-2.5"}`}>
            <button
              type="button"
              onClick={() => onOpenHostDetails(domainName)}
              className={`w-full inline-flex items-center justify-center gap-1.5 ${
                isPhone ? "py-1.5 px-2.5 text-xs rounded-lg" : "py-1.5 px-3 text-xs rounded-xl"
              } bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-950 text-white font-semibold shadow-xs hover:shadow transition-all group/btn border border-slate-700/50`}
            >
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>{t("whoisExpiryHostInfo")}</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform text-slate-400" />
            </button>
          </div>
        )}
      </div>

      <div
        className={`${
          isPhone ? "mt-2.5 pt-2" : "mt-4 pt-3"
        } border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400`}
      >
        <div className="flex items-center gap-2">
          {result.latencyMs !== undefined && (
            <span className="font-mono text-[10.5px] text-slate-400 dark:text-slate-500">
              {result.latencyMs}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t("copyUrl")}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t("openPlatformLink")}
          >
            <span className="text-[11px]">{t("visit")}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
