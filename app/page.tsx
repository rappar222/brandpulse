"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckResult,
  ActiveTab,
  WikiSummaryResult,
  TrademarkCheckResult,
  PersonaMode,
  ShortlistBrandItem,
  CheckStatus,
} from "@/lib/types";
import { sanitizeBrandName } from "@/lib/checkers";
import { generateSuggestions } from "@/lib/suggestions";
import { SearchBar } from "@/components/SearchBar";
import { CategorySection } from "@/components/CategorySection";
import { AlternateSuggestions } from "@/components/AlternateSuggestions";
import { StatsOverview } from "@/components/StatsOverview";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { useLanguage } from "@/lib/i18n";
import { RegistryDropdownCard } from "@/components/RegistryDropdownCard";
import { WikipediaSummarySection } from "@/components/WikipediaSummarySection";
import { TrademarkSection } from "@/components/TrademarkSection";
import { HostDetailsModal } from "@/components/HostDetailsModal";
import { ShortlistModal } from "@/components/ShortlistModal";
import { LaunchChecklistModal } from "@/components/LaunchChecklistModal";
import { useIsPhone } from "@/lib/useIsPhone";
import {
  ShieldCheck,
  Zap,
  RefreshCw,
  Search,
  History,
  Plus,
  X,
  Globe,
  Download,
  Star,
  Scale,
  Sparkles,
  Users,
} from "lucide-react";

function computeShortlistEntry(
  name: string,
  results: CheckResult[]
): ShortlistBrandItem {
  const domains = results.filter((r) => r.category === "Domains");
  const socials = results.filter((r) => r.category === "Social & Platforms");
  const packages = results.filter((r) => r.category === "Package Registries");

  const domainsAvailable = domains.filter((r) => r.status === "available").length;
  const socialsAvailable = socials.filter((r) => r.status === "available").length;
  const packagesAvailable = packages.filter((r) => r.status === "available").length;

  const findTldStatus = (tld: string): CheckStatus => {
    const found = domains.find((d) => d.platform.toLowerCase() === `.${tld}`);
    return found ? found.status : "unknown";
  };

  const comStatus = findTldStatus("com");
  const aiStatus = findTldStatus("ai");
  const ioStatus = findTldStatus("io");

  // Calculate weighted Brandability Score (0 - 100)
  let score = 0;
  if (comStatus === "available") score += 30;
  if (aiStatus === "available") score += 10;
  if (ioStatus === "available") score += 10;

  const domainRatio = domains.length > 0 ? domainsAvailable / domains.length : 0;
  const socialRatio = socials.length > 0 ? socialsAvailable / socials.length : 0;
  const pkgRatio = packages.length > 0 ? packagesAvailable / packages.length : 0;

  score += Math.round(domainRatio * 15);
  score += Math.round(socialRatio * 25);
  score += Math.round(pkgRatio * 10);

  return {
    name,
    addedAt: new Date().toISOString(),
    score: Math.min(100, Math.max(0, score)),
    comStatus,
    aiStatus,
    ioStatus,
    domainsAvailable,
    domainsTotal: domains.length,
    socialsAvailable,
    socialsTotal: socials.length,
    packagesAvailable,
    packagesTotal: packages.length,
  };
}

function HomeContent() {
  const { language, t } = useLanguage();
  const isPhone = useIsPhone();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const compareQuery = searchParams.get("compare") || "";

  const [searchTerm, setSearchTerm] = useState("");
  const [activeBrand, setActiveBrand] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState<ActiveTab>("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "available" | "taken" | "unknown">("all");
  const [personaMode, setPersonaMode] = useState<PersonaMode>("all");

  // Wikipedia Summary State
  const [wikiData, setWikiData] = useState<WikiSummaryResult | null>(null);
  const wikiDataRef = useRef<WikiSummaryResult | null>(null);
  const [isWikiLoading, setIsWikiLoading] = useState(false);
  const wikiAbortRef = useRef<AbortController | null>(null);

  // Trademark & Legal Clearance State
  const [trademarkData, setTrademarkData] = useState<TrademarkCheckResult | null>(null);
  const [isTrademarkLoading, setIsTrademarkLoading] = useState(false);
  const trademarkAbortRef = useRef<AbortController | null>(null);

  // Custom TLDs, Search History & Shortlist
  const [customTlds, setCustomTlds] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("brandpulse_custom_tlds");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const customTldsRef = useRef<string[]>(customTlds);
  useEffect(() => {
    customTldsRef.current = customTlds;
  }, [customTlds]);

  const [newTldInput, setNewTldInput] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("brandpulse_recent_searches");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [shortlist, setShortlist] = useState<ShortlistBrandItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("brandpulse_shortlist");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isShortlistOpen, setIsShortlistOpen] = useState(false);
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);
  const [dropdownRegistryId, setDropdownRegistryId] = useState<string>("nuget");
  const [ownedBrands, setOwnedBrands] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem("brandpulse_owned_brands");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Host Details Modal State (RDAP + Check-Host.net)
  const [hostDetailsDomain, setHostDetailsDomain] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Load custom TLDs, recent searches, shortlist, and declared owned brands from localStorage on mount
  useEffect(() => {
    try {
      const storedTlds = localStorage.getItem("brandpulse_custom_tlds");
      if (storedTlds) {
        setCustomTlds(JSON.parse(storedTlds));
      }
      const storedHistory = localStorage.getItem("brandpulse_recent_searches");
      if (storedHistory) {
        setRecentSearches(JSON.parse(storedHistory));
      }
      const storedShortlist = localStorage.getItem("brandpulse_shortlist");
      if (storedShortlist) {
        setShortlist(JSON.parse(storedShortlist));
      }
      const storedOwned = localStorage.getItem("brandpulse_owned_brands");
      if (storedOwned) {
        setOwnedBrands(JSON.parse(storedOwned));
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Refresh localized Wikipedia, web summary and trademark screening whenever the selected language changes
  useEffect(() => {
    if (activeBrand) {
      const tldsParam =
        customTlds.length > 0
          ? `&customTlds=${encodeURIComponent(customTlds.join(","))}`
          : "";
      fetch(`/api/wikipedia?q=${encodeURIComponent(activeBrand)}${tldsParam}&lang=${language}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            wikiDataRef.current = data;
            setWikiData(data);
          }
        })
        .catch(() => {});

      fetch(`/api/trademark?q=${encodeURIComponent(activeBrand)}${tldsParam}&lang=${language}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: TrademarkCheckResult | null) => {
          if (data) {
            setTrademarkData(data);
          }
        })
        .catch(() => {});
    }
  }, [language, activeBrand, customTlds]);

  const handleToggleBrandOwnership = (brand: string) => {
    const clean = brand.trim().toLowerCase();
    if (!clean) return;
    setOwnedBrands((prev) => {
      const next = prev.includes(clean)
        ? prev.filter((b) => b !== clean)
        : [...prev, clean];
      try {
        localStorage.setItem("brandpulse_owned_brands", JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const isCurrentBrandOwned = ownedBrands.includes(activeBrand.trim().toLowerCase());

  const executeCheck = useCallback(
    async (nameToCheck: string, tldsList?: string[], isTldOnlyUpdate = false) => {
      const clean = sanitizeBrandName(nameToCheck);
      if (!clean) {
        setResults([]);
        setSuggestions([]);
        setActiveBrand("");
        setError(null);
        setIsChecking(false);
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (!isTldOnlyUpdate) {
        setIsChecking(true);
        setError(null);
        setActiveBrand(clean);

        try {
          const url = new URL(window.location.href);
          url.searchParams.set("q", clean);
          window.history.replaceState(null, "", url.toString());
          localStorage.setItem("brandpulse_last_query", clean);

          setRecentSearches((prev) => {
            const updated = [clean, ...prev.filter((item) => item !== clean)].slice(0, 8);
            localStorage.setItem("brandpulse_recent_searches", JSON.stringify(updated));
            return updated;
          });
        } catch {
          // Ignore URL state errors
        }

        setSuggestions(generateSuggestions(clean));
      }

      const rawTldMatch = nameToCheck
        .trim()
        .toLowerCase()
        .match(/\.([a-z]{2,24}(\.[a-z]{2,8})?)$/i);
      const typedTld = rawTldMatch ? rawTldMatch[1] : null;

      const activeTlds =
        tldsList !== undefined
          ? tldsList
          : customTldsRef.current.length > 0
          ? customTldsRef.current
          : customTlds;
      const combinedTlds =
        typedTld && !activeTlds.includes(typedTld)
          ? [typedTld, ...activeTlds]
          : activeTlds;

      // Sync last executed key so URL replaceState doesn't trigger duplicate call
      const currentExecKey = `${clean}::${[...combinedTlds].sort().join(",")}`;
      lastExecutedKeyRef.current = currentExecKey;

      const tldsParam =
        combinedTlds.length > 0
          ? `&customTlds=${encodeURIComponent(combinedTlds.join(","))}`
          : "";

      // 1. Fetch Wikipedia & Web Intelligence Summary concurrently
      if (wikiAbortRef.current) {
        wikiAbortRef.current.abort();
      }
      const wikiController = new AbortController();
      wikiAbortRef.current = wikiController;
      if (!isTldOnlyUpdate) {
        setIsWikiLoading(true);
      }

      fetch(`/api/wikipedia?q=${encodeURIComponent(clean)}${tldsParam}&lang=${language}`, {
        signal: wikiController.signal,
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data: WikiSummaryResult | null) => {
          wikiDataRef.current = data;
          if (data) {
            setWikiData(data);
            if (data.allWebsites && data.allWebsites.length > 0) {
              const unknownDomains = new Set(
                data.allWebsites
                  .filter((s) => s.isUnknown)
                  .map((s) => s.domain.toLowerCase())
              );
              if (unknownDomains.size > 0) {
                setResults((prev) => {
                  let hasChange = false;
                  const updated = prev.map((r) => {
                    const domainName = r.url
                      .replace(/^https?:\/\//, "")
                      .replace(/\/$/, "")
                      .toLowerCase();
                    if (unknownDomains.has(domainName) && r.status !== "unknown") {
                      hasChange = true;
                      return {
                        ...r,
                        status: "unknown" as CheckStatus,
                        message: "Unaccessible host & no public WHOIS",
                      };
                    }
                    return r;
                  });
                  return hasChange ? updated : prev;
                });
              }
            }
          } else {
            setWikiData({
              found: false,
              query: clean,
              message: "No existing wikipedia page found",
            });
          }
        })
        .catch((err) => {
          if (err?.name !== "AbortError") {
            setWikiData({
              found: false,
              query: clean,
              message: "No existing wikipedia page found",
            });
          }
        })
        .finally(() => {
          if (!isTldOnlyUpdate) {
            setIsWikiLoading(false);
          }
        });

      // 2. Fetch Trademark & Corporate Legal Clearance concurrently (only on full brand search)
      if (!isTldOnlyUpdate) {
        if (trademarkAbortRef.current) {
          trademarkAbortRef.current.abort();
        }
        const tmController = new AbortController();
        trademarkAbortRef.current = tmController;
        setIsTrademarkLoading(true);

        fetch(`/api/trademark?q=${encodeURIComponent(clean)}${tldsParam}&lang=${language}`, {
          signal: tmController.signal,
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((data: TrademarkCheckResult | null) => {
            if (data) {
              setTrademarkData(data);
            }
          })
          .catch(() => {
            // Ignore abort/network errors
          })
          .finally(() => {
            setIsTrademarkLoading(false);
          });
      }

      // 3. Fetch Multi-Platform Availability
      try {
        const res = await fetch(
          `/api/check?name=${encodeURIComponent(clean)}&format=envelope${tldsParam}`,
          {
            signal: controller.signal,
          }
        );

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();

        const fetchedResults: CheckResult[] = Array.isArray(data)
          ? data
          : data.results || [];

        const unknownDomains = new Set(
          (wikiDataRef.current?.allWebsites || [])
            .filter((s) => s.isUnknown)
            .map((s) => s.domain.toLowerCase())
        );

        const mappedResults =
          unknownDomains.size > 0
            ? fetchedResults.map((r) => {
                const domainName = r.url
                  .replace(/^https?:\/\//, "")
                  .replace(/\/$/, "")
                  .toLowerCase();
                if (unknownDomains.has(domainName)) {
                  return {
                    ...r,
                    status: "unknown" as CheckStatus,
                    message: "Unaccessible host & no public WHOIS",
                  };
                }
                return r;
              })
            : fetchedResults;

        setResults(mappedResults);

        // If this brand is already in the shortlist, refresh its score/counts automatically
        setShortlist((prev) => {
          if (!prev.some((item) => item.name === clean)) return prev;
          const updatedEntry = computeShortlistEntry(clean, fetchedResults);
          const next = prev.map((item) => (item.name === clean ? updatedEntry : item));
          localStorage.setItem("brandpulse_shortlist", JSON.stringify(next));
          return next;
        });

        if (!isTldOnlyUpdate && data.suggestions && Array.isArray(data.suggestions)) {
          setSuggestions(data.suggestions);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        if (!isTldOnlyUpdate) {
          setError(err instanceof Error ? err.message : "Failed to check availability");
        }
      } finally {
        if (!isTldOnlyUpdate) {
          setIsChecking(false);
        }
      }
    },
    [customTlds]
  );

  // Sync unknown domains detected by web crawler into the results
  useEffect(() => {
    if (wikiData?.allWebsites && wikiData.allWebsites.length > 0) {
      const unknownDomains = new Set(
        wikiData.allWebsites
          .filter((s) => s.isUnknown)
          .map((s) => s.domain.toLowerCase())
      );
      if (unknownDomains.size > 0) {
        setResults((prev) => {
          let hasChange = false;
          const updated = prev.map((r) => {
            const domainName = r.url
              .replace(/^https?:\/\//, "")
              .replace(/\/$/, "")
              .toLowerCase();
            if (unknownDomains.has(domainName) && r.status !== "unknown") {
              hasChange = true;
              return {
                ...r,
                status: "unknown" as CheckStatus,
                message: "Unaccessible host & no public WHOIS",
              };
            }
            return r;
          });
          return hasChange ? updated : prev;
        });
      }
    }
  }, [wikiData]);

  // Auto-execute if URL explicitly has ?q=... (incorporating loaded custom TLDs)
  const lastExecutedKeyRef = useRef<string>("");
  useEffect(() => {
    if (!urlQuery) return;

    let currentTlds = customTldsRef.current.length > 0 ? customTldsRef.current : customTlds;
    if (currentTlds.length === 0 && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("brandpulse_custom_tlds");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentTlds = parsed;
          }
        }
      } catch {
        // Ignore storage errors
      }
    }

    const tldsKey = [...currentTlds].sort().join(",");
    const executionKey = `${urlQuery}::${tldsKey}`;

    if (executionKey !== lastExecutedKeyRef.current) {
      lastExecutedKeyRef.current = executionKey;
      setSearchTerm(urlQuery);
      executeCheck(urlQuery, currentTlds);
    }
  }, [urlQuery, customTlds, executeCheck]);

  // Handle shareable shortlist URL (?compare=brand1,brand2,brand3)
  useEffect(() => {
    if (!compareQuery) return;
    const names = compareQuery
      .split(",")
      .map((n) => sanitizeBrandName(n))
      .filter(Boolean)
      .slice(0, 8);
    if (names.length === 0) return;

    setIsShortlistOpen(true);

    // Fetch availability for any shared brands not already in the shortlist
    (async () => {
      for (const brand of names) {
        try {
          const res = await fetch(`/api/check?name=${encodeURIComponent(brand)}&format=envelope`);
          if (!res.ok) continue;
          const data = await res.json();
          const fetched: CheckResult[] = Array.isArray(data) ? data : data.results || [];
          if (fetched.length > 0) {
            const entry = computeShortlistEntry(brand, fetched);
            setShortlist((prev) => {
              const filtered = prev.filter((item) => item.name !== brand);
              const next = [entry, ...filtered];
              localStorage.setItem("brandpulse_shortlist", JSON.stringify(next));
              return next;
            });
          }
        } catch {}
      }
    })();
  }, [compareQuery]);

  // Handle browser Back / Forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q && q !== activeBrand) {
        setSearchTerm(q);
        executeCheck(q);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeBrand, executeCheck]);

  const handleDebouncedChange = (val: string) => {
    setSearchTerm(val);
    const clean = sanitizeBrandName(val);
    if (clean.length >= 3) {
      executeCheck(val);
    }
  };

  const handleImmediateSearch = (val: string) => {
    setSearchTerm(val);
    executeCheck(val);
  };

  const handleSelectSuggestion = (suggestedName: string) => {
    setSearchTerm(suggestedName);
    executeCheck(suggestedName);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Toggle current brand in Shortlist
  const isCurrentBrandShortlisted = Boolean(
    activeBrand && shortlist.some((item) => item.name === activeBrand)
  );

  const handleToggleShortlist = () => {
    if (!activeBrand || results.length === 0) return;
    setShortlist((prev) => {
      const exists = prev.some((item) => item.name === activeBrand);
      const next = exists
        ? prev.filter((item) => item.name !== activeBrand)
        : [computeShortlistEntry(activeBrand, results), ...prev];
      localStorage.setItem("brandpulse_shortlist", JSON.stringify(next));
      return next;
    });
  };

  const handleRemoveFromShortlist = (nameToRemove: string) => {
    setShortlist((prev) => {
      const next = prev.filter((item) => item.name !== nameToRemove);
      localStorage.setItem("brandpulse_shortlist", JSON.stringify(next));
      return next;
    });
  };

  const handleClearShortlist = () => {
    setShortlist([]);
    localStorage.removeItem("brandpulse_shortlist");
  };

  // Custom TLD management (supports multi-part TLDs like .co.uk)
  const handleAddCustomTld = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTldInput
      .trim()
      .toLowerCase()
      .replace(/^\.+/, "")
      .replace(/\.+$/, "")
      .replace(/[^a-z0-9.-]/g, "")
      .replace(/\.{2,}/g, ".");

    const defaultTlds = ["com", "org", "io", "dev", "app", "ai"];
    if (!clean || defaultTlds.includes(clean) || customTlds.includes(clean)) {
      setNewTldInput("");
      return;
    }

    const updated = [...customTlds, clean];
    setCustomTlds(updated);
    setNewTldInput("");
    localStorage.setItem("brandpulse_custom_tlds", JSON.stringify(updated));

    if (activeBrand) {
      executeCheck(activeBrand, updated, true);
    }
  };

  const handleRemoveCustomTld = (tldToRemove: string) => {
    const updated = customTlds.filter((t) => t !== tldToRemove);
    setCustomTlds(updated);
    localStorage.setItem("brandpulse_custom_tlds", JSON.stringify(updated));

    if (activeBrand) {
      executeCheck(activeBrand, updated, true);
    }
  };

  const handleApplyGeoPreset = (presetTlds: string[]) => {
    const defaultTlds = ["com", "org", "io", "dev", "app", "ai"];
    const merged = Array.from(
      new Set([
        ...customTlds,
        ...presetTlds.filter((t) => !defaultTlds.includes(t)),
      ])
    );
    setCustomTlds(merged);
    localStorage.setItem("brandpulse_custom_tlds", JSON.stringify(merged));
    if (activeBrand) {
      executeCheck(activeBrand, merged, true);
    }
  };

  const handleClearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem("brandpulse_recent_searches");
  };

  // Persona Mode Filtering
  const personaFilteredResults = results.filter((item) => {
    if (personaMode === "startup") {
      // In Startup Mode, keep all Domains & Socials, and only core cloud/JS/Python packages
      if (item.category === "Package Registries") {
        const p = item.platform.toLowerCase();
        return p === "npm" || p === "pypi";
      }
      return true;
    }
    if (personaMode === "developer") {
      // In DevTool Mode, keep all Domains & Package Registries, and technical social platforms
      if (item.category === "Social & Platforms") {
        const p = item.platform.toLowerCase();
        return (
          p.includes("github") ||
          p.includes("gitlab") ||
          p.includes("dev.to") ||
          p.includes("docker") ||
          p.includes("hugging") ||
          p.includes("twitter") ||
          p.includes("x") ||
          p.includes("substack")
        );
      }
      return true;
    }
    return true;
  });

  // Category & Status Filtering
  const filteredResults = personaFilteredResults.filter((item) => {
    if (
      selectedCategory !== "All" &&
      selectedCategory !== "Wikipedia" &&
      selectedCategory !== "Trademark" &&
      item.category !== selectedCategory
    ) {
      return false;
    }
    if (statusFilter !== "all" && item.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const domainResults = filteredResults.filter((r) => r.category === "Domains");
  const packageResults = filteredResults.filter(
    (r) => r.category === "Package Registries"
  );
  const socialResults = filteredResults.filter(
    (r) => r.category === "Social & Platforms"
  );

  const defaultPackageNames = [
    "npm",
    "pypi",
    "crates.io",
    "aur",
    "apt",
    "rubygems",
    "homebrew",
  ];
  const defaultPackageResults = packageResults.filter((r) =>
    defaultPackageNames.some(
      (dp) => r.platform.toLowerCase() === dp || r.platform.toLowerCase().includes(dp)
    )
  );

  const dropdownResult = results.find((r) => {
    const p = (r.platform || "").toLowerCase();
    if (dropdownRegistryId === "rpm" && (p === "rpm" || p.includes("rpm") || p.includes("fedora"))) return true;
    if (dropdownRegistryId === "nuget" && p.includes("nuget")) return true;
    if (dropdownRegistryId === "pub.dev" && p.includes("pub")) return true;
    if (dropdownRegistryId === "hex.pm" && p.includes("hex")) return true;
    if (dropdownRegistryId === "packagist" && p.includes("packagist")) return true;
    if (dropdownRegistryId === "cpan" && p.includes("cpan")) return true;
    if (dropdownRegistryId === "clojars" && p.includes("clojars")) return true;
    return false;
  });

  const showDropdownCard =
    personaMode !== "startup" &&
    (statusFilter === "all" ||
      (dropdownResult && dropdownResult.status === statusFilter) ||
      (!dropdownResult && isChecking));

  const hasTakenHandles = results.some((r) => r.status === "taken");

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 glassmorphism sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div
            onClick={() => {
              setSearchTerm("");
              setActiveBrand("");
              setResults([]);
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl theme-gradient-logo flex items-center justify-center text-white shadow-md">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-extrabold tracking-tight theme-gradient-title">
                  PulsarCheck
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  {t("launchSuite")}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
                {t("headerSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            {activeBrand && (
              <button
                onClick={() => executeCheck(activeBrand)}
                disabled={isChecking}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors disabled:opacity-50"
                title="Refresh current search"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${
                    isChecking ? "animate-spin text-indigo-500" : ""
                  }`}
                />
                <span>{t("recheck")}</span>
              </button>
            )}

            {/* Brand Shortlist & Compare Button */}
            <button
              type="button"
              onClick={() => setIsShortlistOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border-2 border-slate-300 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs hover:shadow-xs transition-all"
              title="Open Brand Shortlist & Side-by-Side Comparison Matrix"
            >
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400 flex-shrink-0" />
              <span className="hidden sm:inline">{t("shortlistAndCompare")}</span>
              <span className="sm:hidden">{t("shortlist")}</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-mono text-[10px] font-black border border-amber-300/70 dark:border-amber-800">
                {shortlist.length}
              </span>
            </button>

            <LanguageSelector />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        className={`max-w-7xl mx-auto w-full flex-1 ${
          isPhone
            ? activeBrand
              ? "px-3 py-3 space-y-4"
              : "px-3.5 py-6 space-y-5"
            : "px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-10"
        }`}
      >
        {/* Hero Section */}
        {isPhone && activeBrand ? (
          // Compact sticky search bar when viewing results on phone
          <section className="space-y-2">
            <SearchBar
              value={searchTerm}
              onChange={handleDebouncedChange}
              onSearchImmediate={handleImmediateSearch}
              isLoading={isChecking}
              debounceMs={700}
            />
            {recentSearches.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 text-xs">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-0.5 flex-shrink-0">
                  <History className="w-3 h-3" />
                  {t("recent")}
                </span>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSearchTerm(item);
                      executeCheck(item);
                    }}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      activeBrand === item
                        ? "bg-indigo-600 text-white font-bold"
                        : "bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section className="text-center max-w-3xl mx-auto space-y-3.5 sm:space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{t("heroValidationBadge")}</span>
            </div>

            <h1 className="text-2xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              {t("heroMainTitle1")} <br className="hidden sm:inline" />
              <span className="theme-gradient-title">
                {t("heroMainTitle2")}
              </span>
            </h1>

            <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400">
              {t("heroSubtitle")}
            </p>

            {/* Central Search Bar */}
            <div className="pt-1 sm:pt-2">
              <SearchBar
                value={searchTerm}
                onChange={handleDebouncedChange}
                onSearchImmediate={handleImmediateSearch}
                isLoading={isChecking}
                debounceMs={700}
              />
            </div>

            {/* Recent Searches Chips */}
            {recentSearches.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-2 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400 font-medium mr-1">
                  <History className="w-3.5 h-3.5" />
                  {t("recent")}
                </span>
                {recentSearches.map((item) => (
                  <button
                    key={item}
                    onClick={() => {
                      setSearchTerm(item);
                      executeCheck(item);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium transition-all ${
                      activeBrand === item
                        ? "bg-indigo-600 text-white font-bold shadow-xs border-2 border-indigo-600"
                        : "bg-white hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-2 border-slate-300 dark:border-slate-700 shadow-2xs"
                    }`}
                  >
                    {item}
                  </button>
                ))}
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline ml-1"
                  title="Clear recent searches history"
                >
                  {t("clear")}
                </button>
              </div>
            )}
          </section>
        )}

        {/* Error Notification */}
        {error && (
          <div className="max-w-3xl mx-auto p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => executeCheck(activeBrand)}
              className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors"
            >
              {t("retry")}
            </button>
          </div>
        )}

        {/* Results & Stats */}
        {activeBrand && (
          <div className="space-y-8">
            {/* Stats Bar, Persona Mode, Filters & Shortlist Toggle */}
            <StatsOverview
              results={personaFilteredResults}
              allResults={results}
              name={activeBrand}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              statusFilter={statusFilter}
              onSelectStatusFilter={setStatusFilter}
              wikiFound={wikiData ? wikiData.found : null}
              trademarkRisk={trademarkData ? trademarkData.riskLevel : null}
              personaMode={personaMode}
              onSelectPersonaMode={setPersonaMode}
              isShortlisted={isCurrentBrandShortlisted}
              onToggleShortlist={handleToggleShortlist}
              onOpenChecklist={() => setIsChecklistOpen(true)}
              isOwned={isCurrentBrandOwned}
              onToggleOwnership={() => handleToggleBrandOwnership(activeBrand)}
            />

            {/* Pre-Verified Startup Alternates when taken */}
            {hasTakenHandles && suggestions.length > 0 && (
              <AlternateSuggestions
                suggestions={suggestions}
                onSelectSuggestion={handleSelectSuggestion}
                originalName={activeBrand}
                customTlds={customTlds}
              />
            )}

            {/* Categorized Sections */}
            <div className="space-y-8 sm:space-y-10">
              {(selectedCategory === "All" || selectedCategory === "Domains") && (
                <CategorySection
                  category="Domains"
                  results={domainResults}
                  isChecking={isChecking}
                  onOpenHostDetails={setHostDetailsDomain}
                  subHeader={
                    <div className="flex flex-col gap-3 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 shadow-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Globe className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {t("topDomainsVerified")}
                          </span>
                          <span className="text-xs font-mono text-slate-500">
                            .com, .org, .io, .dev, .app, .ai
                          </span>
                          {customTlds.map((tld) => (
                            <span
                              key={tld}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono text-xs font-bold border-2 border-indigo-200 dark:border-indigo-800"
                            >
                              .{tld}
                              <button
                                onClick={() => handleRemoveCustomTld(tld)}
                                className="hover:text-rose-500 transition-colors ml-0.5"
                                title={`Remove .${tld}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>

                        {/* Add Custom TLD Form */}
                        <form
                          onSubmit={handleAddCustomTld}
                          className="flex items-center gap-1.5 self-start sm:self-auto flex-shrink-0"
                        >
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">
                              .
                            </span>
                            <input
                              type="text"
                              value={newTldInput}
                              onChange={(e) => setNewTldInput(e.target.value)}
                              placeholder="co.uk, de, xyz"
                              className="pl-5 pr-2 py-1 text-xs rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-indigo-500 font-mono w-36"
                            />
                          </div>
                          <button
                            type="submit"
                            disabled={!newTldInput.trim()}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs font-semibold transition-colors shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>{t("add")}</span>
                          </button>
                        </form>
                      </div>

                      {/* 1-Click Country & Industry Geo-TLD Presets */}
                      <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1 flex-nowrap sm:flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 flex-shrink-0">
                          {t("regionPacks")}
                        </span>
                        {[
                          { label: "🇷🇴 Romania (.ro, .eu)", tlds: ["ro", "eu"] },
                          { label: "🇪🇺 Europe (.eu, .de, .fr, .nl)", tlds: ["eu", "de", "fr", "nl"] },
                          { label: "🇬🇧 UK (.co.uk, .uk)", tlds: ["co.uk", "uk"] },
                          { label: "🚀 Startup (.co, .xyz, .tech)", tlds: ["co", "xyz", "tech"] },
                        ].map((pack) => (
                          <button
                            key={pack.label}
                            type="button"
                            onClick={() => handleApplyGeoPreset(pack.tlds)}
                            className="px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800/70 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 font-semibold text-[11px] transition-all flex-shrink-0 whitespace-nowrap"
                          >
                            + {pack.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  }
                />
              )}

              {(selectedCategory === "All" ||
                selectedCategory === "Social & Platforms") && (
                <CategorySection
                  category="Social & Platforms"
                  results={socialResults}
                  isChecking={isChecking}
                />
              )}

              {(selectedCategory === "All" ||
                selectedCategory === "Package Registries") && (
                <CategorySection
                  category="Package Registries"
                  results={defaultPackageResults}
                  isChecking={isChecking}
                  customTargetCount={
                    !showDropdownCard
                      ? defaultPackageResults.length
                      : statusFilter === "all"
                      ? defaultPackageResults.length + 1
                      : defaultPackageResults.length + 1
                  }
                  appendCard={
                    showDropdownCard ? (
                      <RegistryDropdownCard
                        name={activeBrand}
                        allResults={results}
                        isChecking={isChecking}
                        selectedId={dropdownRegistryId}
                        onSelect={setDropdownRegistryId}
                      />
                    ) : null
                  }
                />
              )}

              {/* Trademark, Corporate & Legal Clearance Section */}
              {(selectedCategory === "All" ||
                selectedCategory === "Trademark") && (
                <TrademarkSection
                  name={activeBrand}
                  trademarkData={trademarkData}
                  isLoading={isTrademarkLoading}
                  isOwned={isCurrentBrandOwned}
                  onToggleOwnership={() => handleToggleBrandOwnership(activeBrand)}
                />
              )}

              {/* Wikipedia & Web Intelligence Section */}
              {(selectedCategory === "All" ||
                selectedCategory === "Wikipedia") && (
                <WikipediaSummarySection
                  name={activeBrand}
                  wikiData={wikiData}
                  isLoading={isWikiLoading}
                />
              )}

              {selectedCategory !== "Wikipedia" &&
                selectedCategory !== "Trademark" &&
                filteredResults.length === 0 && (
                  <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {t("noResultsMatch")}
                    </p>
                    <button
                      onClick={() => {
                        setSelectedCategory("All");
                        setStatusFilter("all");
                      }}
                      className="mt-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {t("resetFilters")}
                    </button>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Welcoming Customer Landing State when no search term is active */}
        {!activeBrand && (
          <div className="max-w-4xl mx-auto py-8 space-y-8">
            {/* Quick-Try Brand Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="font-bold text-slate-500 dark:text-slate-400">
                {t("tryExample")}
              </span>
              {["linear", "hyperflow", "veloce", "stratalabs", "lumina"].map(
                (sample) => (
                  <button
                    key={sample}
                    type="button"
                    onClick={() => {
                      setSearchTerm(sample);
                      executeCheck(sample);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500 font-mono font-bold text-slate-700 dark:text-slate-200 shadow-2xs transition-all"
                  >
                    {sample}
                  </button>
                )
              )}
            </div>

            {/* Founder Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Globe className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t("featureDomainsTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("featureDomainsDesc")}
                </p>
              </div>

              <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t("featureSocialsTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("featureSocialsDesc")}
                </p>
              </div>

              <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t("featureTrademarkTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("featureTrademarkDesc")}
                </p>
              </div>

              <div className="p-5 rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 space-y-2 shadow-2xs">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  {t("featureShortlistTitle")}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("featureShortlistDesc")}
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Host Details & RDAP WHOIS Modal */}
      {hostDetailsDomain && (
        <HostDetailsModal
          domain={hostDetailsDomain}
          onClose={() => setHostDetailsDomain(null)}
        />
      )}

      {/* Brand Shortlist & Comparison Matrix Modal */}
      {isShortlistOpen && (
        <ShortlistModal
          items={shortlist}
          onClose={() => setIsShortlistOpen(false)}
          onSelectBrand={(brandName) => {
            setSearchTerm(brandName);
            executeCheck(brandName);
          }}
          onRemoveBrand={handleRemoveFromShortlist}
          onClearAll={handleClearShortlist}
        />
      )}

      {/* Company Launch Claim Checklist Modal */}
      {isChecklistOpen && activeBrand && (
        <LaunchChecklistModal
          brandName={activeBrand}
          results={results}
          onClose={() => setIsChecklistOpen(false)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 py-6 mt-12 bg-white/50 dark:bg-slate-950/50 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className="font-semibold text-slate-700 dark:text-slate-300">PulsarCheck</span>
            <span>•</span>
            <span>
              RDAP + Cloudflare DoH, GitLab, Dev.to, Substack, GitHub, Docker Hub, Hugging Face, X, YouTube, LinkedIn, USPTO/EUIPO &amp; 14+ Package Registries
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
            <a
              href="/brandpulse-architecture.svg"
              download="brandpulse-architecture.svg"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-800 hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium text-[11px]"
              title="Download Architecture Scheme (.svg)"
            >
              <Download className="w-3 h-3 text-indigo-500" />
              <span>{t("architectureDownload")}</span>
            </a>
            <span>{t("builtWith")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-slate-500">
          Loading availability checker...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
