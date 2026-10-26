import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function checkDomainAvailability(name: string, tld: string = "com"): Promise<{
  name: string;
  domain: string;
  tld: string;
  available: boolean;
}> {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  const cleanTld = (tld || "com").trim().toLowerCase().replace(/^\.+/, "");
  const domain = `${clean}.${cleanTld}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);

  try {
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(
      domain
    )}&type=NS`;
    const res = await fetch(dohUrl, {
      headers: { Accept: "application/dns-json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { name: clean, domain, tld: cleanTld, available: false };
    }
    const data = await res.json();
    // Status 3 = NXDOMAIN (unregistered)
    return {
      name: clean,
      domain,
      tld: cleanTld,
      available: data.Status === 3,
    };
  } catch {
    return { name: clean, domain, tld: cleanTld, available: false };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const namesParam = searchParams.get("names") || "";
  const tldParam = (searchParams.get("tld") || "com")
    .trim()
    .toLowerCase()
    .replace(/^\.+/, "");

  const names = namesParam
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 25);

  if (names.length === 0) {
    return NextResponse.json({ results: {}, tld: tldParam });
  }

  const checks = await Promise.all(
    names.map((n) => checkDomainAvailability(n, tldParam))
  );

  const resultsMap: Record<string, boolean> = {};
  for (const item of checks) {
    resultsMap[item.name] = item.available;
  }

  return NextResponse.json({ results: resultsMap, tld: tldParam });
}
