"use client";

import React from "react";
import { CheckStatus } from "@/lib/types";
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n";

interface StatusBadgeProps {
  status: CheckStatus | "checking";
  latencyMs?: number;
  message?: string;
  size?: "sm" | "md";
}

export function StatusBadge({
  status,
  size = "md",
}: StatusBadgeProps) {
  const { t } = useLanguage();

  if (status === "checking") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        }`}
      >
        <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-500" />
        {t("statusChecking")}
      </span>
    );
  }

  if (status === "available") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-xs ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        {t("statusAvailable")}
      </span>
    );
  }

  if (status === "taken") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/60 shadow-xs ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        }`}
      >
        <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        {t("statusTaken")}
      </span>
    );
  }

  if (status === "unknown") {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300 dark:border-rose-800/80 shadow-xs ${
          size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
        }`}
        title="Unaccessible host with no public WHOIS registration data"
      >
        <AlertCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
        {t("statusUnknown")}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800/70 dark:text-slate-400 border border-slate-200 dark:border-slate-700/60 shadow-xs ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
      }`}
      title="Platform rate-limited or check timed out"
    >
      <AlertCircle className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
      {t("statusError")}
    </span>
  );
}
