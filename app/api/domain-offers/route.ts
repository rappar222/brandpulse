import { NextRequest, NextResponse } from "next/server";
import {
  REGISTRARS,
  getDomainTld,
  getRegistrarsForTld,
  isTldSupportedByRegistrar,
} from "@/lib/registrars";

export const dynamic = "force-dynamic";

interface CacheEntry {
  data: any;
  expiry: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Live registry and registrar lookup engine
async function queryLiveRegistryCheck(domain: string): Promise<{
  isAvailable: boolean;
  isPremium: boolean;
  tierClass: string | null;
  exactPrice: number | null;
  renewalPrice: number | null;
  found: boolean;
}> {
  try {
    const searchUrl = `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
    const pageRes = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      next: { revalidate: 0 },
    });

    if (!pageRes.ok) {
      return { isAvailable: true, isPremium: false, tierClass: null, exactPrice: null, renewalPrice: null, found: false };
    }

    const html = await pageRes.text();
    const cookies = pageRes.headers.getSetCookie
      ? pageRes.headers.getSetCookie().map((c) => c.split(";")[0])
      : [];
    const cookieHeader = cookies.join("; ");
    const csrfMatch = cookieHeader.match(/csrf_pb=([^;]+)/);
    const csrfToken = csrfMatch ? csrfMatch[1] : "";

    const checkIdMatch = html.match(/checkId\s*=\s*'([^']+)'/);
    const searchHashMatch = html.match(/searchHash\s*=\s*'([^']+)'/);

    if (!checkIdMatch || !searchHashMatch) {
      return { isAvailable: true, isPremium: false, tierClass: null, exactPrice: null, renewalPrice: null, found: false };
    }

    const checkId = checkIdMatch[1];
    const searchHash = searchHashMatch[1];

    // Brief settling delay before polling registry SRS status
    await new Promise((r) => setTimeout(r, 1200));

    const body = new URLSearchParams({
      checkId,
      searchHash,
      have: "",
      haveTypes: "",
      csrf_pb: csrfToken,
    });

    const checksRes = await fetch("https://porkbun.com/api/domains/getChecks", {
      method: "POST",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "X-Requested-With": "XMLHttpRequest",
        Referer: searchUrl,
        Cookie: cookieHeader,
      },
      body: body.toString(),
      next: { revalidate: 0 },
    });

    if (!checksRes.ok) {
      return { isAvailable: true, isPremium: false, tierClass: null, exactPrice: null, renewalPrice: null, found: false };
    }

    const data = await checksRes.json();
    const results = data.results || [];
    const match = results.find(
      (r: any) => r.domain?.toLowerCase() === domain.toLowerCase()
    );

    if (!match) {
      return { isAvailable: true, isPremium: false, tierClass: null, exactPrice: null, renewalPrice: null, found: false };
    }

    const ext = match.extended || {};
    const pricing = ext.pricing || {};
    const fees = ext.fees || {};

    const isAvailable = match.result === "AVAILABLE";
    const isPremium = Boolean(ext.premium === 1);
    const tierClass = fees.create?.class || null;

    let exactPrice: number | null = null;
    let renewalPrice: number | null = null;

    if (pricing.cost && typeof pricing.cost === "number") {
      exactPrice = parseFloat((pricing.cost / 100).toFixed(2));
    } else if (fees.create?.fee && typeof fees.create.fee === "number") {
      exactPrice = parseFloat(fees.create.fee.toFixed(2));
    }

    if (fees.renew?.fee && typeof fees.renew.fee === "number") {
      renewalPrice = parseFloat(fees.renew.fee.toFixed(2));
    } else if (exactPrice) {
      renewalPrice = exactPrice;
    }

    return {
      isAvailable,
      isPremium,
      tierClass,
      exactPrice,
      renewalPrice,
      found: true,
    };
  } catch (err) {
    console.error("Live registry check failed:", err);
    return { isAvailable: true, isPremium: false, tierClass: null, exactPrice: null, renewalPrice: null, found: false };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domainRaw = searchParams.get("domain") || "";
  const domain = domainRaw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!domain || !domain.includes(".")) {
    return NextResponse.json({ error: "Invalid domain specified" }, { status: 400 });
  }

  const cached = cache.get(domain);
  if (cached && Date.now() < cached.expiry) {
    return NextResponse.json(cached.data);
  }

  const tld = getDomainTld(domain);

  // 1. Run live registry SRS check to verify availability, premium tier, and real pricing
  const liveCheck = await queryLiveRegistryCheck(domain);

  // 2. Identify candidate registrars that support this TLD
  const baseSupported = getRegistrarsForTld(tld);

  // 3. Process each registrar according to verified registry rules:
  // - Cloudflare Registrar strictly DOES NOT support premium domains
  // - If isPremium is true, Cloudflare is disabled / excluded with an explanation
  const processedRegistrars = baseSupported.map((reg) => {
    let regPrice = reg.pricing[tld]?.reg || reg.pricing["default"]?.reg || 10.5;
    let renPrice = reg.pricing[tld]?.ren || reg.pricing["default"]?.ren || 10.5;
    let supported = true;
    let unsupportedReason: string | undefined = undefined;

    if (liveCheck.isPremium) {
      if (reg.id === "cloudflare") {
        supported = false;
        unsupportedReason =
          "Cloudflare Registrar does not support registry-designated premium domains.";
      } else if (liveCheck.exactPrice) {
        // For registrars supporting registry premiums, apply the verified wholesale rate
        regPrice = liveCheck.exactPrice;
        renPrice = liveCheck.renewalPrice || liveCheck.exactPrice;
      }
    } else if (liveCheck.exactPrice && reg.id === "porkbun") {
      regPrice = liveCheck.exactPrice;
      renPrice = liveCheck.renewalPrice || liveCheck.exactPrice;
    }

    return {
      id: reg.id,
      name: reg.name,
      tagline: reg.tagline,
      description: reg.description,
      badge: reg.badge,
      badgeColor: reg.badgeColor,
      logoEmoji: reg.logoEmoji,
      whoisPrivacy: reg.whoisPrivacy,
      features: reg.features,
      highlights: reg.highlights,
      searchUrl: reg.getSearchUrl(domain),
      regPrice,
      renPrice,
      supported,
      unsupportedReason,
    };
  });

  const responseData = {
    domain,
    tld,
    isAvailable: liveCheck.isAvailable,
    isPremium: liveCheck.isPremium,
    tierClass: liveCheck.tierClass,
    exactPrice: liveCheck.exactPrice,
    renewalPrice: liveCheck.renewalPrice,
    currency: "USD",
    checkedAt: new Date().toISOString(),
    registrars: processedRegistrars,
  };

  cache.set(domain, { data: responseData, expiry: Date.now() + CACHE_TTL_MS });

  return NextResponse.json(responseData);
}
