"use client";

import React from "react";
import { Category, CheckResult } from "@/lib/types";
import { ResultCard } from "./ResultCard";
import { Globe, Package, Share2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface CategorySectionProps {
  category: Category;
  results: CheckResult[];
  isChecking?: boolean;
  subHeader?: React.ReactNode;
  appendCard?: React.ReactNode;
  customTargetCount?: number;
  onOpenHostDetails?: (domain: string) => void;
}

export function CategorySection({
  category,
  results,
  isChecking = false,
  subHeader,
  appendCard,
  customTargetCount,
  onOpenHostDetails,
}: CategorySectionProps) {
  const { t } = useLanguage();
  if (results.length === 0 && !appendCard) return null;

  const availableCount = results.filter((r) => r.status === "available").length;
  const takenCount = results.filter((r) => r.status === "taken").length;
  const totalCount = customTargetCount ?? results.length;

  const getCategoryTitle = () => {
    switch (category) {
      case "Domains":
        return t("catDomains");
      case "Package Registries":
        return t("catPackages");
      case "Social & Platforms":
        return t("catSocials");
      default:
        return category;
    }
  };

  const getCategoryIcon = () => {
    switch (category) {
      case "Domains":
        return <Globe className="w-5 h-5 text-blue-500" />;
      case "Package Registries":
        return <Package className="w-5 h-5 text-amber-500" />;
      case "Social & Platforms":
        return <Share2 className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <section className="space-y-3.5">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {getCategoryIcon()}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {getCategoryTitle()}
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300">
            {totalCount} {t("targets")}
          </span>
          {!isChecking && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              {availableCount} {t("available")}
            </span>
          )}
        </div>
      </div>

      {subHeader && <div>{subHeader}</div>}

      <div
        className={`grid gap-3.5 sm:gap-4 ${
          results.length + (appendCard ? 1 : 0) === 1
            ? "grid-cols-1 max-w-sm"
            : results.length + (appendCard ? 1 : 0) === 2
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 max-w-3xl"
            : results.length + (appendCard ? 1 : 0) === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {results.map((result) => (
          <ResultCard
            key={result.platform}
            result={result}
            isChecking={isChecking}
            onOpenHostDetails={onOpenHostDetails}
          />
        ))}
        {appendCard}
      </div>
    </section>
  );
}
