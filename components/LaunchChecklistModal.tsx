"use client";

import React, { useState, useEffect } from "react";
import { CheckResult } from "@/lib/types";
import { PlatformLogo } from "@/components/PlatformLogo";
import { useLanguage } from "@/lib/i18n";
import {
  CheckSquare,
  Square,
  ExternalLink,
  X,
  Rocket,
  CheckCircle2,
  Globe,
  Share2,
  Package,
  Scale,
  RotateCcw,
} from "lucide-react";

interface LaunchChecklistModalProps {
  brandName: string;
  results: CheckResult[];
  onClose: () => void;
}

function getRegistrationUrl(item: CheckResult, brandName: string): { url: string; actionLabel: string } {
  if (item.category === "Domains") {
    const tld = item.platform.replace(/^\.+/, "");
    const fullDomain = `${brandName}.${tld}`;
    return {
      url: `/offers?domain=${encodeURIComponent(fullDomain)}&from=${encodeURIComponent(brandName)}`,
      actionLabel: `Register ${fullDomain}`,
    };
  }

  const p = item.platform.toLowerCase();
  if (p.includes("github")) {
    return { url: "https://github.com/account/organizations/new", actionLabel: "Create GitHub Org" };
  }
  if (p.includes("gitlab")) {
    return { url: "https://gitlab.com/groups/new", actionLabel: "Create GitLab Group" };
  }
  if (p.includes("linkedin")) {
    return { url: "https://www.linkedin.com/company/setup/new/", actionLabel: "Create LinkedIn Page" };
  }
  if (p.includes("twitter") || p === "x" || p.includes("x/")) {
    return { url: "https://x.com/i/flow/signup", actionLabel: "Register @Handle on X" };
  }
  if (p.includes("youtube")) {
    return { url: "https://www.youtube.com/create_channel", actionLabel: "Claim YouTube @Handle" };
  }
  if (p.includes("tiktok")) {
    return { url: "https://www.tiktok.com/signup", actionLabel: "Sign Up on TikTok" };
  }
  if (p.includes("dev.to")) {
    return { url: "https://dev.to/enter?state=new-user", actionLabel: "Claim Dev.to Profile" };
  }
  if (p.includes("substack")) {
    return { url: "https://substack.com/signup", actionLabel: "Start Substack Publication" };
  }
  if (p.includes("bluesky")) {
    return { url: "https://bsky.app", actionLabel: "Claim Bluesky Handle" };
  }
  if (p.includes("telegram")) {
    return { url: item.url, actionLabel: "Claim on Telegram" };
  }
  if (p.includes("docker")) {
    return { url: "https://hub.docker.com/signup", actionLabel: "Create Docker Namespace" };
  }
  if (p.includes("hugging")) {
    return { url: "https://huggingface.co/organizations/new", actionLabel: "Create HF Organization" };
  }
  if (p === "npm") {
    return { url: "https://www.npmjs.com/org/create", actionLabel: "Reserve npm Scope/Pkg" };
  }
  if (p === "pypi") {
    return { url: "https://pypi.org/account/register/", actionLabel: "Reserve on PyPI" };
  }

  return {
    url: item.url,
    actionLabel: `Claim on ${item.platform}`,
  };
}

export function LaunchChecklistModal({
  brandName,
  results,
  onClose,
}: LaunchChecklistModalProps) {
  const { t } = useLanguage();
  const storageKey = `brandpulse_checklist_${brandName.toLowerCase()}`;
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setCheckedIds(JSON.parse(saved));
      } else {
        setCheckedIds({});
      }
    } catch {
      setCheckedIds({});
    }
  }, [storageKey]);

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleReset = () => {
    setCheckedIds({});
    try {
      localStorage.removeItem(storageKey);
    } catch {}
  };

  const availableDomains = results.filter(
    (r) => r.category === "Domains" && r.status === "available"
  );
  const availableSocials = results.filter(
    (r) => r.category === "Social & Platforms" && r.status === "available"
  );
  const availablePackages = results.filter(
    (r) => r.category === "Package Registries" && r.status === "available"
  );

  const legalSteps = [
    {
      id: "legal-uspto",
      title: `Search & File USPTO Trademark for "${brandName}"`,
      subtitle: "US Federal Class 9 / 42 Software & Class 35 Business",
      url: `https://tmsearch.uspto.gov/search/search-information`,
      actionLabel: "Open USPTO Search",
    },
    {
      id: "legal-euipo",
      title: `Search & File EUIPO European Trademark for "${brandName}"`,
      subtitle: "EU-wide trademark protection across 27 member states",
      url: `https://euipo.europa.eu/eSearch/#basic/1+1+1+1/100+100+100+100/${encodeURIComponent(
        brandName
      )}`,
      actionLabel: "Open EUIPO eSearch",
    },
    {
      id: "legal-inc",
      title: `Verify Legal Entity Incorporation Name ("${brandName} SRL / Inc. / Ltd")`,
      subtitle: "Check national corporate registry before filing articles of incorporation",
      url: `https://opencorporates.com/companies?q=${encodeURIComponent(brandName)}`,
      actionLabel: "OpenCorporates Check",
    },
  ];

  const totalTasks =
    availableDomains.length +
    availableSocials.length +
    availablePackages.length +
    legalSteps.length;

  const completedTasks = Object.values(checkedIds).filter(Boolean).length;
  const progressPct =
    totalTasks > 0 ? Math.min(100, Math.round((completedTasks / totalTasks) * 100)) : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-7 space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 flex-shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl theme-gradient-logo flex items-center justify-center text-white shadow-md flex-shrink-0">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  Company Launch Claim Checklist: &ldquo;{brandName}&rdquo;
                </h3>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {completedTasks}/{totalTasks} Claimed ({progressPct}%)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Lock down your available domains, social handles, and trademark filings before announcing your launch. Progress is saved automatically.
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

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-slate-700 dark:text-slate-300">
              Brand Lockdown Progress
            </span>
            <span className="text-indigo-600 dark:text-indigo-400">
              {progressPct}% Complete
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 1. Available Domains */}
        {availableDomains.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>Step 1: Register Available Domains ({availableDomains.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableDomains.map((item) => {
                const id = `domain-${item.platform}`;
                const checked = Boolean(checkedIds[id]);
                const reg = getRegistrationUrl(item, brandName);
                return (
                  <div
                    key={id}
                    onClick={() => toggleItem(id)}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      checked
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 text-slate-500 line-through"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <span className="font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {brandName}
                        {item.platform}
                      </span>
                    </div>
                    <a
                      href={reg.url}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex-shrink-0 transition-colors no-underline"
                    >
                      <span>{t("claim")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. Available Social & Community Handles */}
        {availableSocials.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Share2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Step 2: Reserve Social &amp; Developer Handles ({availableSocials.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableSocials.map((item) => {
                const id = `social-${item.platform}`;
                const checked = Boolean(checkedIds[id]);
                const reg = getRegistrationUrl(item, brandName);
                return (
                  <div
                    key={id}
                    onClick={() => toggleItem(id)}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      checked
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 text-slate-500 line-through"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <PlatformLogo platform={item.platform} className="w-4 h-4 flex-shrink-0" />
                      <div className="truncate">
                        <div className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {item.platform}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 truncate">
                          {item.handleTested || `@${brandName}`}
                        </div>
                      </div>
                    </div>
                    <a
                      href={reg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex-shrink-0 transition-colors"
                    >
                      <span>{t("signUp")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Legal & Trademark Steps */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Scale className="w-3.5 h-3.5 text-amber-500" />
            <span>Step 3: Legal Incorporation &amp; Trademark Filing</span>
          </div>
          <div className="space-y-2">
            {legalSteps.map((step) => {
              const checked = Boolean(checkedIds[step.id]);
              return (
                <div
                  key={step.id}
                  onClick={() => toggleItem(step.id)}
                  className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                    checked
                      ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 text-slate-500 line-through"
                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {step.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {step.subtitle}
                      </div>
                    </div>
                  </div>
                  <a
                    href={step.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-indigo-500 text-slate-700 dark:text-slate-200 text-[11px] font-bold flex-shrink-0 transition-colors"
                  >
                    <span>{step.actionLabel}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Package Namespaces (if any) */}
        {availablePackages.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              <Package className="w-3.5 h-3.5 text-purple-500" />
              <span>Step 4: Reserve SDK &amp; Package Registries ({availablePackages.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availablePackages.slice(0, 6).map((item) => {
                const id = `pkg-${item.platform}`;
                const checked = Boolean(checkedIds[id]);
                const reg = getRegistrationUrl(item, brandName);
                return (
                  <div
                    key={id}
                    onClick={() => toggleItem(id)}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between gap-2 cursor-pointer transition-all ${
                      checked
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-400 dark:border-emerald-800 text-slate-500 line-through"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <PlatformLogo platform={item.platform} className="w-4 h-4 flex-shrink-0" />
                      <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                        {item.platform}
                      </span>
                    </div>
                    <a
                      href={reg.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 text-[11px] font-bold flex-shrink-0 transition-colors"
                    >
                      <span>{t("reserve")}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t("resetChecklist")}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{t("doneBtn")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
