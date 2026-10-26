import { NextRequest, NextResponse } from "next/server";
import net from "net";
import { CheckHostDetails } from "@/lib/types";

async function fetchRdapInfo(domain: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "application/rdap+json, application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    let registrar = "";
    if (Array.isArray(data.entities)) {
      for (const ent of data.entities) {
        if (Array.isArray(ent.roles) && ent.roles.includes("registrar")) {
          // Extract vcard fn
          const vcard = ent.vcardArray?.[1];
          if (Array.isArray(vcard)) {
            const fnEntry = vcard.find((row: any) => Array.isArray(row) && row[0] === "fn");
            if (fnEntry && fnEntry[3]) {
              registrar = String(fnEntry[3]);
              break;
            }
          }
          if (!registrar && ent.handle) {
            registrar = String(ent.handle);
          }
        }
      }
    }

    let registeredDate = "";
    let expiryDate = "";
    if (Array.isArray(data.events)) {
      for (const ev of data.events) {
        if (ev.eventAction === "registration" && ev.eventDate) {
          registeredDate = String(ev.eventDate).split("T")[0];
        } else if (ev.eventAction === "expiration" && ev.eventDate) {
          expiryDate = String(ev.eventDate).split("T")[0];
        }
      }
    }

    const domainStatus: string[] = Array.isArray(data.status)
      ? data.status.map((s: any) => String(s))
      : [];

    const nameservers: string[] = Array.isArray(data.nameservers)
      ? data.nameservers
          .map((ns: any) => String(ns.ldhName || "").toLowerCase())
          .filter(Boolean)
      : [];

    return {
      registrar: registrar || undefined,
      registeredDate: registeredDate || undefined,
      expiryDate: expiryDate || undefined,
      domainStatus: domainStatus.length > 0 ? domainStatus : undefined,
      nameservers: nameservers.length > 0 ? nameservers : undefined,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWhoisPort43(domain: string): Promise<{
  registrar?: string;
  registeredDate?: string;
  expiryDate?: string;
  nameservers?: string[];
  domainStatus?: string[];
} | null> {
  const parts = domain.split(".");
  const tld = parts.slice(1).join(".").toLowerCase();

  let whoisServer = "";
  if (tld === "ro") whoisServer = "whois.rotld.ro";
  else if (tld === "de") whoisServer = "whois.denic.de";
  else if (tld === "uk" || tld === "co.uk") whoisServer = "whois.nic.uk";
  else if (tld === "eu") whoisServer = "whois.eu";
  else if (tld === "fr") whoisServer = "whois.nic.fr";
  else if (tld === "it") whoisServer = "whois.nic.it";
  else if (tld === "nl") whoisServer = "whois.domain-registry.nl";
  else if (tld === "ch") whoisServer = "whois.nic.ch";
  else if (tld === "at") whoisServer = "whois.nic.at";
  else if (tld === "ca") whoisServer = "whois.cira.ca";
  else if (tld === "au" || tld === "com.au") whoisServer = "whois.auda.org.au";
  else if (tld === "jp") whoisServer = "whois.jprs.jp";
  else whoisServer = `whois.nic.${tld}`;

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (result: any) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    try {
      const socket = net.createConnection(43, whoisServer, () => {
        socket.write(`${domain}\r\n`);
      });
      socket.setTimeout(2500);
      let data = "";
      socket.on("data", (chunk) => {
        data += chunk.toString("utf8");
      });
      socket.on("end", () => {
        if (!data || data.length < 10) return finish(null);

        const registrar =
          data.match(/(?:Registrar|Sponsoring Registrar|registrar-name):\s*([^\r\n]+)/i)?.[1]?.trim();

        const registeredDate =
          data.match(/(?:Registered On|Registration Date|Creation Date|created):\s*([^\r\n]+)/i)?.[1]?.trim()?.split("T")[0];

        const expiryDate =
          data.match(/(?:Registry Expiry Date|Expiration Date|paid-till|expires):\s*([^\r\n]+)/i)?.[1]?.trim()?.split("T")[0];

        const nsMatches = Array.from(data.matchAll(/(?:Nameserver|Name Server|nserver):\s*([^\r\n]+)/gi));
        const nameservers = nsMatches
          .map((m) => m[1].trim().toLowerCase().replace(/\.$/, ""))
          .filter(Boolean);

        const statusMatches = Array.from(data.matchAll(/(?:Domain Status|Status):\s*([^\r\n]+)/gi));
        const domainStatus = statusMatches
          .map((m) => m[1].trim().split(" ")[0])
          .filter(Boolean);

        if (!registrar && !registeredDate && nameservers.length === 0) {
          return finish(null);
        }

        finish({
          registrar: registrar || undefined,
          registeredDate: registeredDate || undefined,
          expiryDate: expiryDate || undefined,
          nameservers: nameservers.length > 0 ? Array.from(new Set(nameservers)) : undefined,
          domainStatus: domainStatus.length > 0 ? domainStatus : undefined,
        });
      });
      socket.on("timeout", () => {
        socket.destroy();
        finish(null);
      });
      socket.on("error", () => {
        socket.destroy();
        finish(null);
      });
    } catch {
      finish(null);
    }
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawDomain = searchParams.get("domain") || "";
  const cleanDomain = rawDomain
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/\/.*$/, "");

  if (!cleanDomain) {
    return NextResponse.json(
      { ok: false, error: "Missing or invalid domain" },
      { status: 400 }
    );
  }

  const checkHostUrl = `https://check-host.net/ip-info?host=${encodeURIComponent(cleanDomain)}`;
  const pingUrl = `https://check-host.net/check-ping?host=${encodeURIComponent(cleanDomain)}`;
  const httpUrl = `https://check-host.net/check-http?host=${encodeURIComponent(cleanDomain)}`;
  const dnsUrl = `https://check-host.net/check-dns?host=${encodeURIComponent(cleanDomain)}`;
  const tcpUrl = `https://check-host.net/check-tcp?host=${encodeURIComponent(cleanDomain)}`;

  const [initialRdap, checkHostResult] = await Promise.all([
    fetchRdapInfo(cleanDomain),
    (async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4500);
      try {
        const res = await fetch(checkHostUrl, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
          next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        const html = await res.text();

        const getTableValue = (labelRegex: string): string => {
          const match = html.match(
            new RegExp(
              `<td>${labelRegex}<\\/td>\\s*<td[^>]*>([\\s\\S]*?)<\\/td>`,
              "i"
            )
          );
          if (!match) return "";
          return match[1]
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        };

        const ip = getTableValue("IP address");
        const hostName = getTableValue("Host name");
        let ipRange = getTableValue("IP range");
        if (ipRange) {
          ipRange = ipRange.replace(/\s*CIDR\s*/i, "").trim();
        }
        const asn = getTableValue("ASN");
        const isp = getTableValue("ISP\\s*\\/\\s*Org");
        let country = getTableValue("Country");
        if (country) {
          country = country.replace(/\s+/g, " ").trim();
        }
        const region = getTableValue("Region");
        const city = getTableValue("City");

        const flagMatch = html.match(
          /<img[^>]*class=["'][^"']*flag[^"']*["'][^>]*src=["']([^"']+)["']/i
        );
        const flagUrl = flagMatch
          ? flagMatch[1].startsWith("http")
            ? flagMatch[1]
            : `https://check-host.net${flagMatch[1]}`
          : null;

        if (!ip && !isp) return null;
        return { ip, hostName, ipRange, asn, isp, country, flagUrl, region, city };
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })(),
  ]);

  let rdapData = initialRdap;
  if (!rdapData || (!rdapData.registrar && !rdapData.registeredDate)) {
    const whoisFallback = await fetchWhoisPort43(cleanDomain);
    if (whoisFallback) {
      rdapData = {
        registrar: whoisFallback.registrar || rdapData?.registrar,
        registeredDate: whoisFallback.registeredDate || rdapData?.registeredDate,
        expiryDate: whoisFallback.expiryDate || rdapData?.expiryDate,
        nameservers: whoisFallback.nameservers || rdapData?.nameservers,
        domainStatus: whoisFallback.domainStatus || rdapData?.domainStatus,
      };
    }
  }

  if (!checkHostResult && !rdapData) {
    return NextResponse.json<CheckHostDetails>({
      ok: false,
      domain: cleanDomain,
      error:
        "No active web server or public RDAP record could be retrieved for this domain.",
      checkHostUrl,
      pingUrl,
      httpUrl,
      dnsUrl,
      tcpUrl,
    });
  }

  const nsString = (rdapData?.nameservers || []).join(" ").toLowerCase();
  const isParkedOrHeld =
    !checkHostResult?.ip ||
    nsString.includes("sedoparking") ||
    nsString.includes("bodis") ||
    nsString.includes("afternic") ||
    nsString.includes("dan.com") ||
    nsString.includes("parkingcrew") ||
    (rdapData?.domainStatus || []).some((s) => s.toLowerCase().includes("hold"));

  return NextResponse.json<CheckHostDetails>({
    ok: true,
    domain: cleanDomain,
    ip: checkHostResult?.ip,
    hostName: checkHostResult?.hostName,
    ipRange: checkHostResult?.ipRange,
    asn: checkHostResult?.asn,
    isp: checkHostResult?.isp,
    country: checkHostResult?.country,
    flagUrl: checkHostResult?.flagUrl,
    region: checkHostResult?.region,
    city: checkHostResult?.city,
    registrar: rdapData?.registrar,
    registeredDate: rdapData?.registeredDate,
    expiryDate: rdapData?.expiryDate,
    domainStatus: rdapData?.domainStatus,
    nameservers: rdapData?.nameservers,
    isParkedOrHeld,
    checkHostUrl,
    pingUrl,
    httpUrl,
    dnsUrl,
    tcpUrl,
  });
}
