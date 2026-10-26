"use client";

import React, { useState, useEffect, useMemo } from "react";
import { CheckResult, Category } from "@/lib/types";
import { StatusBadge } from "./StatusBadge";
import { PlatformLogo } from "./PlatformLogo";
import { ExternalLink, Copy, Check, ChevronDown } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface RegistryOption {
  id: string;
  name: string;
  badge: string;
  icon: string;
}

export const MORE_REGISTRIES: RegistryOption[] = [
  { id: "rpm", name: "RPM", badge: "Fedora / RHEL", icon: "📦" },
  { id: "nuget", name: "NuGet", badge: ".NET / C#", icon: "📦" },
  { id: "pub.dev", name: "Pub.dev", badge: "Dart / Flutter", icon: "🎯" },
  { id: "hex.pm", name: "Hex.pm", badge: "Elixir / Erlang", icon: "⬢" },
  { id: "packagist", name: "Packagist", badge: "PHP / Composer", icon: "🐘" },
  { id: "cpan", name: "CPAN", badge: "Perl", icon: "🐪" },
  { id: "clojars", name: "Clojars", badge: "Clojure", icon: "🔮" },
];

interface RegistryDropdownCardProps {
  name: string;
  allResults: CheckResult[];
  isChecking?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function RegistryDropdownCard({
  name,
  allResults,
  isChecking = false,
  selectedId: controlledSelectedId,
  onSelect,
}: RegistryDropdownCardProps) {
  const { t } = useLanguage();
  const [internalSelectedId, setInternalSelectedId] = useState<string>("nuget");
  const selectedId = controlledSelectedId ?? internalSelectedId;

  const handleSelect = (newId: string) => {
    if (onSelect) {
      onSelect(newId);
    } else {
      setInternalSelectedId(newId);
    }
  };

  const [fallbackResults, setFallbackResults] = useState<Record<string, CheckResult>>({});
  const [isFetchingSingle, setIsFetchingSingle] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const currentOption = useMemo(
    () => MORE_REGISTRIES.find((r) => r.id === selectedId) || MORE_REGISTRIES[0],
    [selectedId]
  );

  // 1. Direct match from bulk check results (instant and synchronized)
  const bulkMatch = useMemo(() => {
    if (!allResults || allResults.length === 0) return null;
    return (
      allResults.find((r) => {
        const p = (r.platform || "").toLowerCase();
        if (selectedId === "rpm" && (p === "rpm" || p.includes("rpm") || p.includes("fedora"))) return true;
        if (selectedId === "nuget" && p.includes("nuget")) return true;
        if (selectedId === "pub.dev" && p.includes("pub")) return true;
        if (selectedId === "hex.pm" && p.includes("hex")) return true;
        if (selectedId === "packagist" && p.includes("packagist")) return true;
        if (selectedId === "cpan" && p.includes("cpan")) return true;
        if (selectedId === "clojars" && p.includes("clojars")) return true;
        return false;
      }) || null
    );
  }, [allResults, selectedId]);

  // 2. If not present in bulk results, fetch single target on demand
  useEffect(() => {
    if (bulkMatch || !name || isChecking) return;
    if (fallbackResults[selectedId]) return;

    let active = true;
    setIsFetchingSingle(true);

    fetch(`/api/check?name=${encodeURIComponent(name)}&target=${encodeURIComponent(selectedId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: CheckResult) => {
        if (active && data?.platform) {
          setFallbackResults((prev) => ({ ...prev, [selectedId]: data }));
        }
      })
      .catch(() => {
        if (active) {
          setFallbackResults((prev) => ({
            ...prev,
            [selectedId]: {
              platform: currentOption.name,
              category: "Package Registries",
              status: "unknown",
              url: `https://www.nuget.org/packages/${encodeURIComponent(name)}`,
              message: "Lookup timed out",
            },
          }));
        }
      })
      .finally(() => {
        if (active) setIsFetchingSingle(false);
      });

    return () => {
      active = false;
    };
  }, [selectedId, name, isChecking, bulkMatch, fallbackResults, currentOption.name]);

  // 3. Resolve active result to display
  const currentResult: CheckResult = useMemo(() => {
    if (bulkMatch) return bulkMatch;
    if (fallbackResults[selectedId]) return fallbackResults[selectedId];

    const fallbackUrl =
      selectedId === "nuget"
        ? `https://www.nuget.org/packages/${encodeURIComponent(name)}`
        : selectedId === "pub.dev"
        ? `https://pub.dev/packages/${encodeURIComponent(name)}`
        : selectedId === "hex.pm"
        ? `https://hex.pm/packages/${encodeURIComponent(name)}`
        : selectedId === "packagist"
        ? `https://packagist.org/packages/${encodeURIComponent(name)}`
        : selectedId === "cpan"
        ? `https://metacpan.org/dist/${encodeURIComponent(name)}`
        : `https://clojars.org/${encodeURIComponent(name)}`;

    return {
      platform: currentOption.name,
      category: "Package Registries" as Category,
      status: "unknown",
      url: fallbackUrl,
      message: isChecking || isFetchingSingle ? "Checking registry..." : undefined,
    };
  }, [bulkMatch, fallbackResults, selectedId, name, currentOption.name, isChecking, isFetchingSingle]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(currentResult.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

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

  const statusToShow =
    isChecking || (isFetchingSingle && !bulkMatch)
      ? "checking"
      : currentResult.status;

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border-2 border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 dark:hover:border-indigo-600 bg-white dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 ring-1 ring-indigo-500/10">
      <div>
        {/* Top Dropdown Selector */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="relative flex-1">
            <select
              value={selectedId}
              onChange={(e) => handleSelect(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-0 focus:border-indigo-500 cursor-pointer appearance-none transition-colors"
            >
              {MORE_REGISTRIES.map((reg) => (
                <option key={reg.id} value={reg.id}>
                  {reg.icon} {reg.name} ({reg.badge})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 flex-shrink-0">
            More
          </span>
        </div>

        {/* Selected Registry Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2 pt-1">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100/90 dark:bg-slate-800/90 p-2 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <PlatformLogo platform={currentOption.id} className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                {currentOption.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {currentOption.badge}
              </p>
            </div>
          </div>

          <StatusBadge
            status={statusToShow}
            latencyMs={currentResult.latencyMs}
            message={currentResult.message}
          />
        </div>

        {currentResult.message && statusToShow !== "checking" && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1 italic">
            {getTranslatedMessage(currentResult)}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {currentResult.latencyMs !== undefined && statusToShow !== "checking" && (
            <span className="font-mono text-[11px] text-slate-400 dark:text-slate-500">
              {currentResult.latencyMs}ms
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Copy ${currentOption.name} URL`}
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <a
            href={currentResult.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={`Open on ${currentOption.name}`}
          >
            <span className="text-[11px]">Visit</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
