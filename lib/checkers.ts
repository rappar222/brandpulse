import { CheckResult, Category } from "./types";

const TIMEOUT_MS = 6500;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const CRATES_UA =
  "BrandAvailabilityChecker/1.0 (https://github.com/brand-checker; contact@brandchecker.dev)";

/**
 * Creates an AbortSignal with a timeout.
 */
function createTimeoutSignal(timeoutMs: number = TIMEOUT_MS): {
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timer),
  };
}

/**
 * Sanitizes input handle or brand name
 */
export function sanitizeBrandName(input: string): string {
  if (!input) return "";
  let clean = input.trim().toLowerCase();

  // Strip leading '@' or 'www.' or protocol
  clean = clean.replace(/^(https?:\/\/)?(www\.)?/, "");
  clean = clean.replace(/^@+/, "");

  // If a full path like github.com/user was entered, take the last segment
  if (clean.includes("/")) {
    const parts = clean.split("/").filter(Boolean);
    clean = parts[parts.length - 1] || "";
  }

  // Strip domain TLD extension if typed as a domain (e.g. .ro, .com, .market, .me, .co.uk, etc.)
  clean = clean.replace(/\.[a-z]{2,24}(\.[a-z]{2,8})?$/i, "");

  // Convert spaces to hyphens, keep alphanumeric, hyphens, and underscores
  clean = clean.replace(/\s+/g, "-").replace(/[^a-z0-9_-]/g, "");

  return clean;
}

/**
 * Adapts a brand handle to each platform's specific character rules:
 * - "domain": hyphens allowed, no underscores (my_brand -> my-brand)
 * - "github": alphanumeric + single hyphens (my_brand -> my-brand)
 * - "underscore": alphanumeric + underscores, no hyphens (my-brand -> my_brand) for X, Instagram, TikTok, Reddit, Telegram
 * - "alphanumeric": strict alphanumeric (my-brand -> mybrand) for Docker Hub
 */
export function formatHandleForPlatform(
  name: string,
  mode: "domain" | "github" | "underscore" | "alphanumeric" | "slug"
): string {
  const base = sanitizeBrandName(name);
  if (!base) return "";

  switch (mode) {
    case "domain":
    case "github":
    case "slug":
      return base
        .replace(/_/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
    case "underscore":
      return base
        .replace(/-/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "");
    case "alphanumeric":
      return base.replace(/[^a-z0-9]/g, "");
  }
}

/**
 * Check Domain Availability via Cloudflare DNS-over-HTTPS (DoH) + RDAP cross-verification.
 * Query NS records first; if NXDOMAIN (Status: 3), cross-check with RDAP to catch
 * domains that are registered/parked without active nameservers.
 */
export async function checkDomain(
  name: string,
  tld: string
): Promise<CheckResult> {
  const cleanLabel = formatHandleForPlatform(name, "domain") || name;
  const domain = `${cleanLabel}.${tld}`;
  const url = `https://${domain}`;
  const platform = `.${tld}`;
  const category: Category = "Domains";
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      domain
    )}&type=NS`;
    const res = await fetch(dohUrl, {
      method: "GET",
      headers: {
        Accept: "application/dns-json",
      },
      signal,
    });

    if (!res.ok) {
      const latencyMs = Date.now() - start;
      return {
        platform,
        category,
        status: "unknown",
        url,
        latencyMs,
        handleTested: domain,
        message: `Cloudflare DNS returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();

    // Status 0 = NOERROR (Domain exists, has records or delegation)
    if (data.Status === 0) {
      const latencyMs = Date.now() - start;
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: domain,
        message:
          data.Answer && data.Answer.length > 0
            ? "Active NS records present"
            : "Active DNS zone registered",
      };
    }

    // Status 3 = NXDOMAIN in DNS -> Cross-verify with RDAP to catch parked/held domains without NS
    if (data.Status === 3) {
      try {
        const rdapSignal = createTimeoutSignal(1800);
        const rdapRes = await fetch(
          `https://rdap.org/domain/${encodeURIComponent(domain)}`,
          {
            method: "GET",
            headers: { Accept: "application/rdap+json, application/json" },
            signal: rdapSignal.signal,
          }
        );
        rdapSignal.cleanup();

        if (rdapRes.status === 200) {
          const latencyMs = Date.now() - start;
          return {
            platform,
            category,
            status: "taken",
            url,
            latencyMs,
            handleTested: domain,
            message: "Registered in WHOIS/RDAP (Parked / No active NS)",
          };
        }
      } catch {
        // RDAP timed out or unsupported TLD -> rely on verified NXDOMAIN
      }

      const latencyMs = Date.now() - start;
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: domain,
        message: "Verified Available (DNS + RDAP)",
      };
    }

    // Fallback for other DNS statuses (e.g. SERVFAIL = 2 often means registered with broken NS)
    if (data.Status === 2) {
      const latencyMs = Date.now() - start;
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: domain,
        message: "Registered (DNS SERVFAIL / Unconfigured NS)",
      };
    }

    const latencyMs = Date.now() - start;
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: domain,
      message: `DNS Status Code: ${data.Status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: domain,
      message: isTimeout ? "DNS query timed out" : "DNS lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check npm registry package availability
 */
export async function checkNpm(name: string): Promise<CheckResult> {
  const platform = "npm";
  const category: Category = "Package Registries";
  const url = `https://www.npmjs.com/package/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://registry.npmjs.org/${encodeURIComponent(name)}`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      }
    );

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        handleTested: name,
        latencyMs,
        message: "Package not found on registry",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        handleTested: name,
        latencyMs,
        message: "Package already published",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      handleTested: name,
      latencyMs,
      message: `Registry response: HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      handleTested: name,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check PyPI package availability
 */
export async function checkPyPI(name: string): Promise<CheckResult> {
  const platform = "PyPI";
  const category: Category = "Package Registries";
  const url = `https://pypi.org/project/${encodeURIComponent(name)}/`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://pypi.org/pypi/${encodeURIComponent(name)}/json`,
      {
        method: "GET",
        headers: { Accept: "application/json" },
        signal,
      }
    );

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        handleTested: name,
        latencyMs,
        message: "Project not found on PyPI",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        handleTested: name,
        latencyMs,
        message: "Package already exists",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      handleTested: name,
      latencyMs,
      message: `PyPI returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      handleTested: name,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Crates.io crate availability
 */
export async function checkCrates(name: string): Promise<CheckResult> {
  const platform = "Crates.io";
  const category: Category = "Package Registries";
  const url = `https://crates.io/crates/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://crates.io/api/v1/crates/${encodeURIComponent(name)}`,
      {
        method: "GET",
        headers: {
          "User-Agent": CRATES_UA,
          Accept: "application/json",
        },
        signal,
      }
    );

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Crate name is available",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Crate already registered",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `Crates.io returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check GitHub handle availability via HEAD request with browser UA
 */
export async function checkGitHub(name: string): Promise<CheckResult> {
  const platform = "GitHub";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "github") || name;
  const url = `https://github.com/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "User or organization not found",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "Account or organization exists",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: `GitHub returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Bluesky handle availability via AT Protocol resolveHandle API
 */
export async function checkBluesky(name: string): Promise<CheckResult> {
  const platform = "Bluesky";
  const category: Category = "Social & Platforms";
  const cleanHandle = formatHandleForPlatform(name, "domain") || name;
  const handle = `${cleanHandle}.bsky.social`;
  const url = `https://bsky.app/profile/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(
      handle
    )}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "Bluesky handle is claimed",
      };
    }

    // Bluesky returns 400 or 404 when handle is not found
    if (res.status === 400 || res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "Handle not registered",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: `Bluesky returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check X / Twitter handle availability via official Twitter oEmbed API + VxTwitter + direct x.com fallback
 */
export async function checkTwitter(name: string): Promise<CheckResult> {
  const platform = "X/Twitter";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "underscore") || name;
  const url = `https://x.com/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    // 1. Twitter's official public oEmbed endpoint: returns 200 with JSON if handle exists, 404 if not found
    const oembedPromise = fetch(
      `https://publish.twitter.com/oembed?url=${encodeURIComponent(`https://twitter.com/${handle}`)}`,
      {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        signal,
      }
    ).catch(() => null);

    // 2. Direct profile check on x.com with manual redirect
    const directPromise = fetch(`https://x.com/${encodeURIComponent(handle)}`, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": BROWSER_UA,
      },
      redirect: "manual",
      signal,
    }).catch(() => null);

    // 3. VxTwitter profile extraction API
    const vxPromise = fetch(`https://api.vxtwitter.com/${encodeURIComponent(handle)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
      },
      signal,
    }).catch(() => null);

    const [oembedRes, directRes, vxRes] = await Promise.all([
      oembedPromise,
      directPromise,
      vxPromise,
    ]);
    const latencyMs = Date.now() - start;

    // A profile is confirmed taken if ANY authoritative source confirms existence:
    const isOembedTaken = oembedRes?.status === 200;
    const isDirectTaken = directRes?.status === 200;
    const isVxTaken = vxRes?.status === 200;

    if (isOembedTaken || isDirectTaken || isVxTaken) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "Profile is active on X",
      };
    }

    // Only definitively mark as available if Twitter official oembed returns 404
    // AND direct x.com does not indicate an active account (e.g. 404 or not 200)
    if (
      oembedRes?.status === 404 &&
      (directRes?.status === 404 || !directRes || directRes.status >= 400)
    ) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "Handle not registered on X",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: oembedRes
        ? `HTTP ${oembedRes.status}`
        : directRes
        ? `HTTP ${directRes.status}`
        : "X lookup inconclusive",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Telegram username availability via t.me
 */
export async function checkTelegram(name: string): Promise<CheckResult> {
  const platform = "Telegram";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "underscore") || name;
  const url = `https://t.me/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        platform,
        category,
        status: "unknown",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: `Telegram returned HTTP ${res.status}`,
      };
    }

    const text = await res.text();
    const isTaken =
      text.includes("tgme_page_title") ||
      text.includes("tgme_page_photo") ||
      text.includes("tgme_page_extra");

    return {
      platform,
      category,
      status: isTaken ? "taken" : "available",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTaken
        ? "Username is claimed on Telegram"
        : "Username is available on Telegram",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check LinkedIn Company Page availability via direct HTTP check + Clearbit fallback
 */
export async function checkLinkedIn(name: string): Promise<CheckResult> {
  const platform = "LinkedIn";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "slug") || name;
  const url = `https://www.linkedin.com/company/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    // 1. Direct company page check with browser UA
    const directPromise = fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": BROWSER_UA,
      },
      signal,
    }).catch(() => null);

    // 2. Clearbit Company Autocomplete
    const suggestPromise = fetch(
      `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(
        handle
      )}`,
      {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        signal,
      }
    ).catch(() => null);

    const [directRes, suggestRes] = await Promise.all([
      directPromise,
      suggestPromise,
    ]);
    const latencyMs = Date.now() - start;

    let matchedCompany: { name: string; domain: string } | null = null;
    if (suggestRes && suggestRes.ok) {
      const companies = await suggestRes.json().catch(() => []);
      if (Array.isArray(companies)) {
        const cleanTarget = handle.replace(/[^a-z0-9]/g, "");
        matchedCompany =
          companies.find((c: any) => {
            const cName = String(c.name || "")
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            const cDomain = String(c.domain || "")
              .toLowerCase()
              .split(".")[0]
              .replace(/[^a-z0-9]/g, "");
            return cName === cleanTarget || cDomain === cleanTarget;
          }) || null;
      }
    }

    if (directRes?.status === 200 || matchedCompany) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `/company/${handle}`,
        message: matchedCompany
          ? `Company "${matchedCompany.name}" registered (${matchedCompany.domain})`
          : "Company page is registered on LinkedIn",
      };
    }

    if (directRes?.status === 404 && !matchedCompany) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `/company/${handle}`,
        message: "No matching corporate page found",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `/company/${handle}`,
      message: "Check company slug on LinkedIn",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `/company/${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check YouTube @handle availability
 */
export async function checkYouTube(name: string): Promise<CheckResult> {
  const platform = "YouTube";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "slug") || name;
  const url = `https://www.youtube.com/@${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": BROWSER_UA,
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "YouTube @handle is available",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "YouTube channel @handle exists",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: `YouTube returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check GitLab handle availability via official namespace existence endpoint + direct check
 */
export async function checkGitLab(name: string): Promise<CheckResult> {
  const platform = "GitLab";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "github") || name;
  const url = `https://gitlab.com/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    // 1. Official GitLab namespace existence endpoint: returns {"exists": true/false}
    const existsApiUrl = `https://gitlab.com/users/${encodeURIComponent(handle)}/exists`;
    const existsRes = await fetch(existsApiUrl, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      signal,
    }).catch(() => null);

    const latencyMs = Date.now() - start;

    if (existsRes && existsRes.ok) {
      const data = await existsRes.json().catch(() => null);
      if (typeof data?.exists === "boolean") {
        if (data.exists) {
          return {
            platform,
            category,
            status: "taken",
            url,
            latencyMs,
            handleTested: `@${handle}`,
            message: "GitLab user or organization exists",
          };
        } else {
          return {
            platform,
            category,
            status: "available",
            url,
            latencyMs,
            handleTested: `@${handle}`,
            message: "Handle is available on GitLab",
          };
        }
      }
    }

    // Fallback if existence endpoint is down or rate-limited: check group and direct profile
    const groupApiUrl = `https://gitlab.com/api/v4/groups/${encodeURIComponent(handle)}`;
    const [groupRes, directRes] = await Promise.all([
      fetch(groupApiUrl, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        signal,
      }).catch(() => null),
      fetch(url, {
        method: "GET",
        headers: { Accept: "text/html", "User-Agent": BROWSER_UA },
        redirect: "manual",
        signal,
      }).catch(() => null),
    ]);

    if (groupRes?.status === 200 || directRes?.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs: Date.now() - start,
        handleTested: `@${handle}`,
        message: "GitLab user or organization exists",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs: Date.now() - start,
      handleTested: `@${handle}`,
      message: "GitLab lookup inconclusive",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check TikTok @handle availability via TikTok oEmbed endpoint with direct profile verification
 */
export async function checkTikTok(name: string): Promise<CheckResult> {
  const platform = "TikTok";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "underscore") || name;
  const url = `https://www.tiktok.com/@${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    // 1. Fast path: oEmbed endpoint
    try {
      const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
      const oembedRes = await fetch(oembedUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent": BROWSER_UA,
        },
        signal,
      });

      if (oembedRes.status === 200) {
        const data = await oembedRes.json();
        if (data && (data.author_name || data.title)) {
          const latencyMs = Date.now() - start;
          return {
            platform,
            category,
            status: "taken",
            url,
            latencyMs,
            handleTested: `@${handle}`,
            message: `TikTok profile is registered${data.author_name ? ` (${data.author_name})` : ""}`,
          };
        }
      }
    } catch {
      // Ignore and proceed to direct profile inspection
    }

    // 2. Direct profile inspection:
    // oEmbed returns 400 for private accounts, accounts with zero public videos, or secret accounts (e.g. @com).
    // We inspect the rehydration data on tiktok.com/@handle directly to verify true existence.
    const pageRes = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": BROWSER_UA,
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (pageRes.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "TikTok @handle is available",
      };
    }

    if (pageRes.status === 200) {
      const html = await pageRes.text();

      // Check for TikTok's SSR Rehydration script
      const scriptMatch = html.match(
        /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
      );
      if (scriptMatch) {
        try {
          const rehydration = JSON.parse(scriptMatch[1]);
          const userDetail =
            rehydration?.["__DEFAULT_SCOPE__"]?.["webapp.user-detail"];
          if (userDetail) {
            const user = userDetail.userInfo?.user;
            const statusCode = userDetail.statusCode;
            const statusMsg = userDetail.statusMsg;

            // Registered user profile
            if (user && (user.uniqueId || user.id)) {
              return {
                platform,
                category,
                status: "taken",
                url,
                latencyMs,
                handleTested: `@${handle}`,
                message: `TikTok profile is registered${
                  user.nickname ? ` (${user.nickname})` : ""
                }`,
              };
            }

            // Private / secret account (code 10222 / ErrBizUserSecret like @com)
            if (statusCode === 10222 || statusMsg === "ErrBizUserSecret") {
              return {
                platform,
                category,
                status: "taken",
                url,
                latencyMs,
                handleTested: `@${handle}`,
                message: "TikTok account is registered (private/protected)",
              };
            }

            // User not found (status 10221)
            if (statusCode === 10221) {
              return {
                platform,
                category,
                status: "available",
                url,
                latencyMs,
                handleTested: `@${handle}`,
                message: "TikTok @handle is available",
              };
            }

            // Suspended / banned / reserved username
            if (statusMsg === "user banned") {
              return {
                platform,
                category,
                status: "taken",
                url,
                latencyMs,
                handleTested: `@${handle}`,
                message: "TikTok handle is reserved or suspended",
              };
            }
          }
        } catch {
          // Fallback to text checks below
        }
      }

      // Fallback HTML heuristics
      if (
        html.includes("Couldn't find this account") ||
        html.includes("user-not-found")
      ) {
        return {
          platform,
          category,
          status: "available",
          url,
          latencyMs,
          handleTested: `@${handle}`,
          message: "TikTok @handle is available",
        };
      }

      if (
        html.includes(`"uniqueId":"${handle}"`) ||
        html.includes('"secUid":')
      ) {
        return {
          platform,
          category,
          status: "taken",
          url,
          latencyMs,
          handleTested: `@${handle}`,
          message: "TikTok profile is registered",
        };
      }

      return {
        platform,
        category,
        status: "unknown",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "TikTok profile state inconclusive",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: `TikTok returned HTTP ${pageRes.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Dev.to profile handle availability via direct page check + public API
 */
export async function checkDevTo(name: string): Promise<CheckResult> {
  const platform = "Dev.to";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "alphanumeric") || name;
  const url = `https://dev.to/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const pageUrl = `https://dev.to/${encodeURIComponent(handle)}`;
    const userApiUrl = `https://dev.to/api/users/by_username?url=${encodeURIComponent(handle)}`;
    const orgApiUrl = `https://dev.to/api/organizations/${encodeURIComponent(handle)}`;

    const [pageRes, userRes, orgRes] = await Promise.all([
      fetch(pageUrl, {
        method: "GET",
        headers: { Accept: "text/html", "User-Agent": BROWSER_UA },
        signal,
      }).catch(() => null),
      fetch(userApiUrl, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        signal,
      }).catch(() => null),
      fetch(orgApiUrl, {
        method: "GET",
        headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
        signal,
      }).catch(() => null),
    ]);

    const latencyMs = Date.now() - start;

    const isPageTaken = pageRes?.status === 200;
    const isUserTaken = userRes?.status === 200;
    const isOrgTaken = orgRes?.status === 200;

    if (isPageTaken || isUserTaken || isOrgTaken) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: isOrgTaken
          ? "Dev.to organization profile exists"
          : "Dev.to member profile is taken",
      };
    }

    if (pageRes?.status === 404 && userRes?.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `@${handle}`,
        message: "Dev.to username is available",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: `Dev.to returned HTTP ${pageRes?.status || userRes?.status || "inconclusive"}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `@${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Docker Hub organization / user namespace availability
 */
export async function checkDockerHub(name: string): Promise<CheckResult> {
  const platform = "Docker Hub";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "alphanumeric") || name;
  const url = `https://hub.docker.com/u/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://hub.docker.com/v2/users/${encodeURIComponent(handle)}/`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `u/${handle}`,
        message: "Docker Hub namespace is available",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `u/${handle}`,
        message: "Namespace exists on Docker Hub",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `u/${handle}`,
      message: `Docker Hub returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `u/${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Hugging Face user / organization handle availability
 */
export async function checkHuggingFace(name: string): Promise<CheckResult> {
  const platform = "Hugging Face";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "slug") || name;
  const url = `https://huggingface.co/${encodeURIComponent(handle)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": BROWSER_UA },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `hf.co/${handle}`,
        message: "Organization / user handle available",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `hf.co/${handle}`,
        message: "Account or AI org exists on Hugging Face",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `hf.co/${handle}`,
      message: `Hugging Face returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `hf.co/${handle}`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Substack publication availability
 */
export async function checkSubstack(name: string): Promise<CheckResult> {
  const platform = "Substack";
  const category: Category = "Social & Platforms";
  const handle = formatHandleForPlatform(name, "slug") || name;
  const url = `https://${encodeURIComponent(handle)}.substack.com`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: "text/html,application/xhtml+xml",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        handleTested: `${handle}.substack.com`,
        message: "Substack publication name is available",
      };
    }

    if (res.status === 200 || res.status === 301 || res.status === 302) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        handleTested: `${handle}.substack.com`,
        message: "Substack publication is claimed",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `${handle}.substack.com`,
      message: `Substack returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      handleTested: `${handle}.substack.com`,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check AUR (Arch User Repository) package availability
 */
export async function checkAUR(name: string): Promise<CheckResult> {
  const platform = "AUR";
  const category: Category = "Package Registries";
  const url = `https://aur.archlinux.org/packages/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://aur.archlinux.org/rpc/v5/info/${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        platform,
        category,
        status: "unknown",
        url,
        latencyMs,
        message: `AUR API returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const isTaken = (data.resultcount || 0) > 0;

    return {
      platform,
      category,
      status: isTaken ? "taken" : "available",
      url,
      latencyMs,
      message: isTaken
        ? (data.results?.[0]?.Description || "Package exists in AUR")
        : "Package name is available in AUR",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check APT (Debian / Ubuntu Package Archive) availability
 */
export async function checkAPT(name: string): Promise<CheckResult> {
  const platform = "APT";
  const category: Category = "Package Registries";
  const url = `https://packages.ubuntu.com/search?keywords=${encodeURIComponent(name)}&exact=1`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://api.launchpad.net/1.0/ubuntu/+archive/primary?ws.op=getPublishedBinaries&binary_name=${encodeURIComponent(name)}&exact_match=true`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        platform,
        category,
        status: "unknown",
        url,
        latencyMs,
        message: `APT Archive returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const isTaken = (data.total_size || 0) > 0;

    return {
      platform,
      category,
      status: isTaken ? "taken" : "available",
      url,
      latencyMs,
      message: isTaken
        ? "Package exists in Ubuntu/Debian APT archive"
        : "Package name is available in APT archive",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check RubyGems package availability
 */
export async function checkRubyGems(name: string): Promise<CheckResult> {
  const platform = "RubyGems";
  const category: Category = "Package Registries";
  const url = `https://rubygems.org/gems/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://rubygems.org/api/v1/gems/${encodeURIComponent(name)}.json`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Gem name is available on RubyGems",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Gem already exists on RubyGems",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `RubyGems returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Homebrew formula availability
 */
export async function checkHomebrew(name: string): Promise<CheckResult> {
  const platform = "Homebrew";
  const category: Category = "Package Registries";
  const url = `https://formulae.brew.sh/formula/${encodeURIComponent(name.toLowerCase())}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://formulae.brew.sh/api/formula/${encodeURIComponent(name.toLowerCase())}.json`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Formula name is available in Homebrew",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Formula exists in Homebrew Core",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `Homebrew returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check NuGet (.NET) package availability
 */
export async function checkNuGet(name: string): Promise<CheckResult> {
  const platform = "NuGet";
  const category: Category = "Package Registries";
  const url = `https://www.nuget.org/packages/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://api.nuget.org/v3/registration5-semver1/${encodeURIComponent(name.toLowerCase())}/index.json`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Package name is available on NuGet",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Package already exists on NuGet",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `NuGet returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Pub.dev (Dart / Flutter) package availability
 */
export async function checkPubDev(name: string): Promise<CheckResult> {
  const platform = "Pub.dev";
  const category: Category = "Package Registries";
  const url = `https://pub.dev/packages/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://pub.dev/api/packages/${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Package name is available on Pub.dev",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Package already exists on Pub.dev",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `Pub.dev returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Hex.pm (Elixir / Erlang) package availability
 */
export async function checkHex(name: string): Promise<CheckResult> {
  const platform = "Hex.pm";
  const category: Category = "Package Registries";
  const url = `https://hex.pm/packages/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://hex.pm/api/packages/${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "User-Agent": "BrandPulse/1.0 (https://brandchecker.dev)",
        Accept: "application/json",
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Package name is available on Hex.pm",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Package already exists on Hex.pm",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `Hex.pm returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Packagist (PHP / Composer) package availability
 */
export async function checkPackagist(name: string): Promise<CheckResult> {
  const platform = "Packagist";
  const category: Category = "Package Registries";
  const url = `https://packagist.org/packages/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://packagist.org/search.json?q=${encodeURIComponent(name)}&per_page=5`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        platform,
        category,
        status: "unknown",
        url,
        latencyMs,
        message: `Packagist returned HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const cleanLower = name.toLowerCase();
    const isTaken = (data.results || []).some(
      (r: any) =>
        r.name?.toLowerCase() === cleanLower ||
        r.name?.toLowerCase().endsWith("/" + cleanLower)
    );

    return {
      platform,
      category,
      status: isTaken ? "taken" : "available",
      url: isTaken && data.results?.[0]?.url ? data.results[0].url : url,
      latencyMs,
      message: isTaken
        ? "Package exists on Packagist"
        : "Package name is available on Packagist",
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check CPAN (Perl / MetaCPAN) distribution availability
 */
export async function checkCPAN(name: string): Promise<CheckResult> {
  const platform = "CPAN";
  const category: Category = "Package Registries";
  const url = `https://metacpan.org/dist/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://fastapi.metacpan.org/v1/release/${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Distribution name is available on CPAN",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Distribution already exists on CPAN",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `MetaCPAN returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check Clojars (Clojure) artifact availability
 */
export async function checkClojars(name: string): Promise<CheckResult> {
  const platform = "Clojars";
  const category: Category = "Package Registries";
  const url = `https://clojars.org/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://clojars.org/api/artifacts/${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Artifact name is available on Clojars",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Artifact already exists on Clojars",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `Clojars returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Check RPM (Fedora / Red Hat Package Archive) availability
 */
export async function checkRPM(name: string): Promise<CheckResult> {
  const platform = "RPM";
  const category: Category = "Package Registries";
  const url = `https://src.fedoraproject.org/rpms/${encodeURIComponent(name)}`;
  const start = Date.now();

  const { signal, cleanup } = createTimeoutSignal(TIMEOUT_MS);

  try {
    const apiUrl = `https://src.fedoraproject.org/api/0/rpms/${encodeURIComponent(name)}`;
    const res = await fetch(apiUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
      },
      signal,
    });

    const latencyMs = Date.now() - start;

    if (res.status === 404) {
      return {
        platform,
        category,
        status: "available",
        url,
        latencyMs,
        message: "Package name is available in RPM repository",
      };
    }

    if (res.status === 200) {
      return {
        platform,
        category,
        status: "taken",
        url,
        latencyMs,
        message: "Package exists in Fedora/Red Hat RPM repository",
      };
    }

    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: `RPM Repository returned HTTP ${res.status}`,
    };
  } catch (err: unknown) {
    const latencyMs = Date.now() - start;
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      platform,
      category,
      status: "unknown",
      url,
      latencyMs,
      message: isTimeout ? "Request timed out" : "Lookup failed",
    };
  } finally {
    cleanup();
  }
}

/**
 * Run concurrent check across all targets using Promise.allSettled
 */
export async function checkAllPlatforms(
  rawName: string,
  customTlds: string[] = []
): Promise<CheckResult[]> {
  const name = sanitizeBrandName(rawName);
  if (!name) return [];

  // Default domains: .com, .org, .io, .dev, .app, .ai
  const defaultTlds = ["com", "org", "io", "dev", "app", "ai"];

  // Normalize any custom TLDs added by user
  const cleanCustom = customTlds
    .map((t) =>
      t
        .trim()
        .toLowerCase()
        .replace(/^\.+/, "")
        .replace(/\.+$/, "")
        .replace(/[^a-z0-9.-]/g, "")
        .replace(/\.{2,}/g, ".")
    )
    .filter((t) => t && !defaultTlds.includes(t));

  const allTlds = [...defaultTlds, ...cleanCustom];

  const taskFns: (() => Promise<CheckResult>)[] = [
    // Domains
    ...allTlds.map((tld) => () => checkDomain(name, tld)),

    // Package Registries: 8 Default Platforms
    () => checkNpm(name),
    () => checkPyPI(name),
    () => checkCrates(name),
    () => checkAUR(name),
    () => checkAPT(name),
    () => checkRubyGems(name),
    () => checkHomebrew(name),
    () => checkNuGet(name),

    // Popular Package Registries for Dropdown Selection
    () => checkRPM(name),
    () => checkPubDev(name),
    () => checkHex(name),
    () => checkPackagist(name),
    () => checkCPAN(name),
    () => checkClojars(name),

    // Social & Platforms
    () => checkGitHub(name),
    () => checkLinkedIn(name),
    () => checkTwitter(name),
    () => checkYouTube(name),
    () => checkGitLab(name),
    () => checkTikTok(name),
    () => checkDevTo(name),
    () => checkBluesky(name),
    () => checkTelegram(name),
    () => checkSubstack(name),
    () => checkDockerHub(name),
    () => checkHuggingFace(name),
  ];

  // Run with concurrency limit of 8 parallel tasks to prevent threadpool starvation and anti-bot rate-limits
  const results: PromiseSettledResult<CheckResult>[] = new Array(taskFns.length);
  let nextIndex = 0;

  const workers = Array.from({ length: Math.min(8, taskFns.length) }, async () => {
    while (nextIndex < taskFns.length) {
      const idx = nextIndex++;
      try {
        const val = await taskFns[idx]();
        results[idx] = { status: "fulfilled", value: val };
      } catch (err) {
        results[idx] = { status: "rejected", reason: err };
      }
    }
  });

  await Promise.all(workers);

  return results.map((settlement, index) => {
    if (settlement.status === "fulfilled") {
      const val = settlement.value;
      if (!val.handleTested && val.category === "Package Registries") {
        return { ...val, handleTested: name };
      }
      return val;
    }

    // In case an unhandled rejection occurred inside a task
    return {
      platform: `Target #${index + 1}`,
      category: "Social & Platforms",
      status: "unknown",
      url: "#",
      message:
        settlement.reason instanceof Error
          ? settlement.reason.message
          : "Unexpected check error",
    };
  });
}
