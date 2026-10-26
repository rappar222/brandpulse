import { NextRequest, NextResponse } from "next/server";
import {
  checkAllPlatforms,
  checkDomain,
  checkNpm,
  checkPyPI,
  checkCrates,
  checkAUR,
  checkAPT,
  checkRubyGems,
  checkHomebrew,
  checkNuGet,
  checkPubDev,
  checkHex,
  checkPackagist,
  checkCPAN,
  checkClojars,
  checkRPM,
  checkGitHub,
  checkTwitter,
  checkBluesky,
  checkTelegram,
  checkTikTok,
  checkYouTube,
  checkLinkedIn,
  checkGitLab,
  checkDevTo,
  checkSubstack,
  checkDockerHub,
  checkHuggingFace,
  sanitizeBrandName,
} from "@/lib/checkers";
import { generateSuggestions } from "@/lib/suggestions";
import { CheckResult } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CheckCacheItem {
  timestamp: number;
  results: CheckResult[];
  suggestions: string[];
}
const apiCheckCache = new Map<string, CheckCacheItem>();
const CACHE_MAX_AGE_MS = 4 * 60 * 1000; // 4 minutes in-memory cache

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawName = searchParams.get("name") || "";
  const target = (searchParams.get("target") || searchParams.get("platform") || "").toLowerCase();
  const format = searchParams.get("format") || "";

  if (!rawName.trim()) {
    return NextResponse.json(
      { error: "Query parameter 'name' is required" },
      { status: 400 }
    );
  }

  const name = sanitizeBrandName(rawName);
  if (!name) {
    return NextResponse.json(
      { error: "Invalid name provided after sanitization" },
      { status: 400 }
    );
  }

  // If a specific platform/target was requested
  if (target) {
    let singleResult: CheckResult;
    switch (target) {
      case "com":
      case ".com":
        singleResult = await checkDomain(name, "com");
        break;
      case "io":
      case ".io":
        singleResult = await checkDomain(name, "io");
        break;
      case "dev":
      case ".dev":
        singleResult = await checkDomain(name, "dev");
        break;
      case "app":
      case ".app":
        singleResult = await checkDomain(name, "app");
        break;
      case "ai":
      case ".ai":
        singleResult = await checkDomain(name, "ai");
        break;
      case "org":
      case ".org":
        singleResult = await checkDomain(name, "org");
        break;
      case "npm":
        singleResult = await checkNpm(name);
        break;
      case "pypi":
        singleResult = await checkPyPI(name);
        break;
      case "crates":
      case "crates.io":
        singleResult = await checkCrates(name);
        break;
      case "aur":
        singleResult = await checkAUR(name);
        break;
      case "apt":
      case "ubuntu":
      case "debian":
        singleResult = await checkAPT(name);
        break;
      case "rubygems":
      case "gem":
      case "ruby":
        singleResult = await checkRubyGems(name);
        break;
      case "homebrew":
      case "brew":
        singleResult = await checkHomebrew(name);
        break;
      case "nuget":
      case "dotnet":
        singleResult = await checkNuGet(name);
        break;
      case "pub":
      case "pub.dev":
      case "flutter":
      case "dart":
        singleResult = await checkPubDev(name);
        break;
      case "hex":
      case "hex.pm":
      case "elixir":
        singleResult = await checkHex(name);
        break;
      case "packagist":
      case "composer":
      case "php":
        singleResult = await checkPackagist(name);
        break;
      case "cpan":
      case "perl":
        singleResult = await checkCPAN(name);
        break;
      case "clojars":
      case "clojure":
        singleResult = await checkClojars(name);
        break;
      case "rpm":
      case "fedora":
      case "redhat":
      case "rhel":
      case "centos":
        singleResult = await checkRPM(name);
        break;
      case "github":
        singleResult = await checkGitHub(name);
        break;
      case "twitter":
      case "x":
      case "x/twitter":
        singleResult = await checkTwitter(name);
        break;
      case "bluesky":
      case "bsky":
        singleResult = await checkBluesky(name);
        break;
      case "telegram":
      case "tg":
        singleResult = await checkTelegram(name);
        break;
      case "tiktok":
        singleResult = await checkTikTok(name);
        break;
      case "youtube":
      case "yt":
        singleResult = await checkYouTube(name);
        break;
      case "linkedin":
        singleResult = await checkLinkedIn(name);
        break;
      case "gitlab":
        singleResult = await checkGitLab(name);
        break;
      case "devto":
      case "dev.to":
        singleResult = await checkDevTo(name);
        break;
      case "substack":
        singleResult = await checkSubstack(name);
        break;
      case "docker":
      case "dockerhub":
        singleResult = await checkDockerHub(name);
        break;
      case "huggingface":
      case "hf":
        singleResult = await checkHuggingFace(name);
        break;
      default: {
        // If target starts with a dot or looks like a TLD, perform domain lookup dynamically
        const cleanedTld = target
          .replace(/^\.+/, "")
          .replace(/\.+$/, "")
          .replace(/[^a-z0-9.-]/g, "")
          .replace(/\.{2,}/g, ".");
        if (cleanedTld && cleanedTld.length >= 2) {
          singleResult = await checkDomain(name, cleanedTld);
          break;
        }
        return NextResponse.json(
          {
            error: `Unknown target '${target}'. Available targets: com, org, io, dev, app, ai, custom TLDs (e.g. .xyz), npm, pypi, crates, aur, apt, github, twitter, bluesky, reddit.`,
          },
          { status: 400 }
        );
      }
    }
    return NextResponse.json(singleResult);
  }

  // Parse extra/custom TLDs if provided (e.g. ?extraTlds=xyz,net,tech)
  const extraTlds = (
    searchParams.get("extraTlds") ||
    searchParams.get("customTlds") ||
    searchParams.get("tlds") ||
    ""
  )
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  // Cached or concurrent lookup for all platforms (including custom TLDs)
  const cacheKey = `${name}:${extraTlds.slice().sort().join(",")}`;
  const cached = apiCheckCache.get(cacheKey);

  let results: CheckResult[];
  let suggestions: string[];

  if (cached && Date.now() - cached.timestamp < CACHE_MAX_AGE_MS) {
    results = cached.results;
    suggestions = cached.suggestions;
  } else {
    results = await checkAllPlatforms(name, extraTlds);
    suggestions = generateSuggestions(name);

    if (apiCheckCache.size > 300) {
      const firstKey = apiCheckCache.keys().next().value;
      if (firstKey) apiCheckCache.delete(firstKey);
    }
    apiCheckCache.set(cacheKey, {
      timestamp: Date.now(),
      results,
      suggestions,
    });
  }

  const availableCount = results.filter((r) => r.status === "available").length;
  const takenCount = results.filter((r) => r.status === "taken").length;
  const unknownCount = results.filter((r) => r.status === "unknown").length;

  const headers = {
    "X-Total-Count": String(results.length),
    "X-Available-Count": String(availableCount),
    "X-Taken-Count": String(takenCount),
    "X-Unknown-Count": String(unknownCount),
    "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
  };

  // If envelope format is requested or explicitly asked for object
  if (format === "envelope" || format === "object" || format === "detailed") {
    return NextResponse.json(
      {
        name,
        sanitized: name,
        timestamp: new Date().toISOString(),
        summary: {
          total: results.length,
          available: availableCount,
          taken: takenCount,
          unknown: unknownCount,
        },
        results,
        suggestions,
      },
      { headers }
    );
  }

  // Default clean JSON array of results: { platform, category, status, url }
  return NextResponse.json(results, { headers });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawName = body?.name || "";
    const target = (body?.target || body?.platform || "").toLowerCase();
    const format = body?.format || "envelope";

    if (!rawName.trim()) {
      return NextResponse.json(
        { error: "Property 'name' is required in request body" },
        { status: 400 }
      );
    }

    const name = sanitizeBrandName(rawName);
    if (!name) {
      return NextResponse.json(
        { error: "Invalid name provided after sanitization" },
        { status: 400 }
      );
    }

    if (target) {
      // Direct single lookup
      const res = await GET(
        new NextRequest(
          new URL(`/api/check?name=${encodeURIComponent(name)}&target=${encodeURIComponent(target)}`, request.url)
        )
      );
      return res;
    }

    const extraTlds: string[] = Array.isArray(body?.customTlds || body?.extraTlds)
      ? (body.customTlds || body.extraTlds)
      : typeof (body?.customTlds || body?.extraTlds) === "string"
      ? (body.customTlds || body.extraTlds).split(",").map((s: string) => s.trim()).filter(Boolean)
      : [];

    const results = await checkAllPlatforms(name, extraTlds);
    const suggestions = generateSuggestions(name);

    if (format === "array") {
      return NextResponse.json(results);
    }

    return NextResponse.json({
      name,
      sanitized: name,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        available: results.filter((r) => r.status === "available").length,
        taken: results.filter((r) => r.status === "taken").length,
        unknown: results.filter((r) => r.status === "unknown").length,
      },
      results,
      suggestions,
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }
}
