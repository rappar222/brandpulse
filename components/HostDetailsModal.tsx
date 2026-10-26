"use client";

import React, { useState, useEffect } from "react";
import { CheckHostDetails } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";
import {
  Server,
  X,
  ExternalLink,
  Copy,
  Check,
  Loader2,
  Globe,
  Radio,
  MapPin,
  Cpu,
  Layers,
  Activity,
  Network,
  AlertCircle,
  Calendar,
  Building2,
  ShieldAlert,
  Tag,
} from "lucide-react";

interface HostDetailsModalProps {
  domain: string;
  onClose: () => void;
}

export function HostDetailsModal({ domain, onClose }: HostDetailsModalProps) {
  const { t } = useLanguage();
  const [data, setData] = useState<CheckHostDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/host-details?domain=${encodeURIComponent(domain)}`)
      .then((res) => res.json())
      .then((json: CheckHostDetails) => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setData({
            ok: false,
            domain,
            error: err instanceof Error ? err.message : "Failed to load domain details",
            checkHostUrl: `https://check-host.net/ip-info?host=${encodeURIComponent(domain)}`,
            pingUrl: `https://check-host.net/check-ping?host=${encodeURIComponent(domain)}`,
            httpUrl: `https://check-host.net/check-http?host=${encodeURIComponent(domain)}`,
            dnsUrl: `https://check-host.net/check-dns?host=${encodeURIComponent(domain)}`,
            tcpUrl: `https://check-host.net/check-tcp?host=${encodeURIComponent(domain)}`,
          });
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [domain]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const checkHostUrl =
    data?.checkHostUrl ||
    `https://check-host.net/ip-info?host=${encodeURIComponent(domain)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center p-0 sm:p-6 bg-slate-950/75 backdrop-blur-xs animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-t-3xl sm:rounded-3xl border-t-2 sm:border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[92vh] overflow-y-auto modal-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto -mt-1 mb-2 flex-shrink-0" />
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl theme-ai-box flex items-center justify-center theme-ai-accent shadow-xs flex-shrink-0">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xl font-black text-slate-900 dark:text-white">
                  {domain}
                </h3>
                {data && !isLoading && (
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      data.isParkedOrHeld
                        ? "bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                        : "bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                    }`}
                  >
                    {data.isParkedOrHeld ? t("parkedHeldDomain") : t("activeHostedDomain")}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                WHOIS / RDAP registration, expiry date, registrar &amp; hosting intelligence
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={t("closeModal")}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl theme-ai-box flex items-center justify-center theme-ai-accent">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Querying RDAP / WHOIS &amp; Check-Host.net...
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                Fetching domain registrar, registration &amp; expiry dates, nameservers, and server IP geolocation.
              </p>
            </div>
          </div>
        )}

        {/* Error / No Details */}
        {!isLoading && data && !data.ok && (
          <div className="space-y-4 py-4">
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-amber-800 dark:text-amber-300">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <h5 className="font-bold text-sm">Domain details could not be parsed</h5>
                <p className="text-xs leading-relaxed">
                  {data.error ||
                    "This domain is registered, but may not currently have an active web server or public RDAP record."}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 flex-wrap gap-2">
              <span className="text-xs text-slate-500">
                Inspect directly via ICANN Lookup or Check-Host:
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://lookup.icann.org/en/lookup?name=${encodeURIComponent(domain)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <span>ICANN WHOIS</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href={checkHostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Open Check-Host.net</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Content When Found */}
        {!isLoading && data && data.ok && (
          <div className="space-y-6">
            {/* 1. WHOIS / RDAP OWNERSHIP & EXPIRY SECTION */}
            <div className="p-4 sm:p-5 rounded-2xl border-2 border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    WHOIS / RDAP Registration &amp; Ownership
                  </span>
                </div>
                <a
                  href={`https://lookup.icann.org/en/lookup?name=${encodeURIComponent(domain)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  <span>ICANN WHOIS Lookup</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase block">
                    Registrar
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                    {data.registrar || "Registry / Private"}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase">
                    <Calendar className="w-3 h-3 text-indigo-500" />
                    <span>{t("registeredOn")}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {data.registeredDate || t("notDisclosed")}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase">
                    <Calendar className="w-3 h-3 text-rose-500" />
                    <span>{t("expiresOn")}</span>
                  </div>
                  <span className="text-xs sm:text-sm font-mono font-bold text-slate-900 dark:text-white mt-0.5 block">
                    {data.expiryDate || t("notDisclosed")}
                  </span>
                </div>
              </div>

              {data.nameservers && data.nameservers.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Nameservers:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {data.nameservers.map((ns) => (
                      <span
                        key={ns}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[11px] text-slate-700 dark:text-slate-300"
                      >
                        {ns}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Aftermarket / Acquisition Links for Founders */}
              <div className="pt-2 border-t border-indigo-200/60 dark:border-indigo-900/50 flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-indigo-500" />
                  <span>Want to acquire this domain? Check aftermarket brokers:</span>
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <a
                    href={`https://sedo.com/search/?keyword=${encodeURIComponent(domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Sedo</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://www.afternic.com/Waitlist/Search?domain=${encodeURIComponent(domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Afternic</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://www.godaddy.com/domainsearch/find?domainToCheck=${encodeURIComponent(domain)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors"
                  >
                    <span>Broker Service</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* Primary IP Card */}
            {data.ip && (
              <div className="p-4 rounded-2xl theme-ai-box flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Primary Server IP Address
                    </span>
                  </div>
                  <div className="text-2xl font-mono font-black text-slate-900 dark:text-white">
                    {data.ip}
                  </div>
                  {data.hostName && data.hostName !== data.ip && (
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-400 truncate max-w-md">
                      PTR: {data.hostName}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => copyToClipboard(data.ip!, "ip")}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors self-start sm:self-auto shadow-2xs"
                >
                  {copiedField === "ip" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{t("copiedIp")}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>{t("copyIp")}</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {/* 2x2 Grid of Host Info */}
            {data.ip && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* ISP / Hosting */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Cpu className="w-4 h-4 theme-ai-accent" />
                    <span>ISP / Hosting Provider</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white break-words">
                    {data.isp || "Unknown Provider"}
                  </div>
                </div>

                {/* ASN */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Network className="w-4 h-4 theme-ai-accent" />
                    <span>Autonomous System (ASN)</span>
                  </div>
                  <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                    {data.asn ? `AS${data.asn}` : "Not Available"}
                  </div>
                </div>

                {/* Location */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <MapPin className="w-4 h-4 theme-ai-accent" />
                    <span>{t("serverLocation")}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                    {data.flagUrl && (
                      <img
                        src={data.flagUrl}
                        alt={data.country || "Flag"}
                        className="w-4 h-3 object-cover rounded-xs inline"
                      />
                    )}
                    <span>
                      {[data.city, data.region, data.country].filter(Boolean).join(", ") ||
                        t("unknownLocation")}
                    </span>
                  </div>
                </div>

                {/* IP Range */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                    <Layers className="w-4 h-4 theme-ai-accent" />
                    <span>IP Range / Subnet</span>
                  </div>
                  <div className="text-xs font-mono text-slate-800 dark:text-slate-200 break-all">
                    {data.ipRange || "Not specified"}
                  </div>
                </div>
              </div>
            )}

            {/* Check-Host.net Diagnostic Tools */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Check-Host.net Live Diagnostic Suite
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <a
                  href={data.pingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all group"
                >
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Ping</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </a>

                <a
                  href={data.httpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all group"
                >
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    <span>HTTP</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </a>

                <a
                  href={data.dnsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all group"
                >
                  <div className="flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-indigo-500" />
                    <span>DNS</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </a>

                <a
                  href={data.tcpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 bg-slate-50 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all group"
                >
                  <div className="flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                    <span>TCP Port</span>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                </a>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs text-slate-400">
                Real-time RDAP WHOIS + Check-Host.net Intelligence
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
                >
                  Close
                </button>

                <a
                  href={checkHostUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <span>Full Check-Host Report</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
