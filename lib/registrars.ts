export interface RegistrarPrice {
  reg: number;
  ren: number;
}

export interface Registrar {
  id: string;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  badgeColor: string;
  logoEmoji: string;
  whoisPrivacy: string;
  features: {
    freePrivacy: boolean;
    freeDnssec: boolean;
    zeroMarkup: boolean;
    flatRenewal: boolean;
  };
  highlights: string[];
  getSearchUrl: (domain: string) => string;
  pricing: Record<string, RegistrarPrice>;
  supportedTlds?: string[];
  unsupportedTlds?: string[];
  supportsTld?: (tld: string) => boolean;
}

export const REGISTRARS: Registrar[] = [
  {
    id: "cloudflare",
    name: "Cloudflare Registrar",
    tagline: "Wholesale at-cost pricing with zero markup",
    description:
      "Cloudflare operates on a strict zero-markup model. Whatever wholesale price registries charge, that is the exact amount you pay. There are no price hikes on renewals, no hidden fees, and no checkout traps. It includes free lifetime WHOIS privacy, automated DNSSEC, two-factor authentication, and native routing through Cloudflare's Anycast DNS network. Note: Cloudflare only supports ICANN gTLDs and a restricted list of ccTLDs (.uk, .co.uk, .ca, .us, .au, .se).",
    badge: "Best At-Cost",
    badgeColor: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800",
    logoEmoji: "☁️",
    whoisPrivacy: "Free Forever",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: true,
      flatRenewal: true,
    },
    highlights: [
      "Wholesale at-cost pricing",
      "Zero markup on renewals",
      "Free WHOIS privacy & DNSSEC",
      "Enterprise Anycast DNS network",
    ],
    getSearchUrl: (domain: string) =>
      `https://dash.cloudflare.com/?to=/:account/domains/register?q=${encodeURIComponent(domain)}`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      // Whitelist of country-code TLDs officially supported by Cloudflare Registrar
      const allowedCc = [
        "uk", "co.uk", "org.uk", "me.uk", "ca", "us", "au", "com.au", "net.au", "org.au", "se", "nu"
      ];
      if (allowedCc.includes(clean)) return true;
      // Cloudflare strictly DOES NOT support any other ccTLDs (e.g. .ro, .eu, .de, .fr, .it, .es, .nl, etc.)
      const ccBlacklist = [
        "ro", "com.ro", "org.ro", "tm.ro", "store.ro", "info.ro", "nom.ro", "nt.ro", "rec.ro", "arts.ro", "firm.ro",
        "eu", "de", "fr", "it", "es", "nl", "be", "ch", "at", "pl", "cz", "gr", "pt", "hu", "bg",
        "dk", "no", "fi", "ru", "ua", "by", "tr", "il", "br", "ar", "cl", "mx", "in", "jp", "cn", "kr",
        "tw", "hk", "sg", "my", "id", "th", "vn", "ph", "za", "ng", "ke", "eg", "ae", "sa", "is", "ie",
        "lu", "ee", "lv", "lt", "sk", "si", "hr", "ba", "rs", "mk", "al", "mt", "cy"
      ];
      if (ccBlacklist.includes(clean) || clean.endsWith(".ro")) return false;
      // Reject any arbitrary two-letter code not in allowed ccTLDs
      if (clean.length === 2) return false;
      return true;
    },
    pricing: {
      com: { reg: 9.77, ren: 9.77 },
      io: { reg: 38.00, ren: 38.00 },
      dev: { reg: 12.00, ren: 12.00 },
      app: { reg: 14.00, ren: 14.00 },
      ai: { reg: 70.00, ren: 70.00 },
      org: { reg: 10.11, ren: 10.11 },
      net: { reg: 10.49, ren: 10.49 },
      xyz: { reg: 10.37, ren: 10.37 },
      co: { reg: 11.50, ren: 11.50 },
      me: { reg: 8.50, ren: 8.50 },
      link: { reg: 5.00, ren: 5.00 },
      uk: { reg: 5.80, ren: 5.80 },
      "co.uk": { reg: 5.80, ren: 5.80 },
      ca: { reg: 10.50, ren: 10.50 },
      us: { reg: 8.50, ren: 8.50 },
      default: { reg: 10.50, ren: 10.50 },
    },
  },
  {
    id: "hostico",
    name: "Hostico",
    tagline: "Certified Romanian ROTLD partner registrar & cloud host",
    description:
      "Hostico is an accredited ROTLD registrar and top-tier hosting company in Romania. Specializing in .ro and European domains, Hostico provides the lowest transparent registration and flat renewal fees with full DNS control and 24/7 dedicated Romanian and English assistance.",
    badge: "Best for .RO",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    logoEmoji: "🇷🇴",
    whoisPrivacy: "Free for Individuals",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: false,
      flatRenewal: true,
    },
    highlights: [
      "Direct ROTLD accredited registrar",
      "Lowest flat .ro renewals ($9.75/yr)",
      "Free DNS & nameserver management",
      "24/7 Romanian & English support",
    ],
    getSearchUrl: (domain: string) =>
      `https://client.hostico.ro/cart.php?a=add&domain=register&query=${encodeURIComponent(domain)}`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      const hosticoTlds = [
        "ro", "com.ro", "org.ro", "store.ro", "info.ro", "tm.ro", "nom.ro", "nt.ro", "rec.ro", "arts.ro", "firm.ro",
        "eu", "com", "net", "org", "info", "biz", "online", "site", "store", "tech", "cloud", "digital"
      ];
      return hosticoTlds.includes(clean) || clean.endsWith(".ro");
    },
    pricing: {
      ro: { reg: 9.75, ren: 9.75 },
      "com.ro": { reg: 9.75, ren: 9.75 },
      "org.ro": { reg: 9.75, ren: 9.75 },
      "store.ro": { reg: 9.75, ren: 9.75 },
      "info.ro": { reg: 9.75, ren: 9.75 },
      eu: { reg: 6.49, ren: 8.49 },
      com: { reg: 11.90, ren: 13.90 },
      net: { reg: 12.50, ren: 14.50 },
      org: { reg: 12.00, ren: 14.00 },
      default: { reg: 9.75, ren: 9.75 },
    },
  },
  {
    id: "rotld",
    name: "ROTLD Registry",
    tagline: "Official national registry of Romanian top-level domains",
    description:
      "ROTLD (National Institute for R&D in Informatics) is the official registry administrator for all .ro top-level domains. Purchasing directly through the registry portal guarantees authoritative registration with direct ownership protection.",
    badge: "Official Registry",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    logoEmoji: "🏛️",
    whoisPrivacy: "Registry Managed",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: true,
      flatRenewal: true,
    },
    highlights: [
      "Authoritative national registry",
      "Direct ownership registration",
      "Official registry WHOIS security",
      "No intermediary markup",
    ],
    getSearchUrl: (domain: string) =>
      `https://www.rotld.ro/portal/pages/en/domain_registration/`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      return clean === "ro" || clean.endsWith(".ro");
    },
    pricing: {
      ro: { reg: 13.00, ren: 13.00 },
      "com.ro": { reg: 13.00, ren: 13.00 },
      "org.ro": { reg: 13.00, ren: 13.00 },
      default: { reg: 13.00, ren: 13.00 },
    },
  },
  {
    id: "porkbun",
    name: "Porkbun",
    tagline: "Cult-favorite indie registrar with lowest retail fees",
    description:
      "Porkbun is a widely beloved, independent ICANN-accredited registrar based in the Pacific Northwest. Known for quirky branding and uncompromising transparency, Porkbun consistently provides some of the lowest first-year and renewal retail rates in the industry. Every registration includes free forever WHOIS privacy, free SSL certificates, URL & email forwarding, and DNS management.",
    badge: "Top Value",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
    logoEmoji: "🐷",
    whoisPrivacy: "Free Forever",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: false,
      flatRenewal: true,
    },
    highlights: [
      "Free WHOIS privacy & SSL certificates",
      "Flat, transparent renewal rates",
      "No hidden checkout fees or aggressive upsells",
      "Friendly community favorite",
    ],
    getSearchUrl: (domain: string) =>
      `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      // Unsupported ccTLDs on Porkbun
      const unsupported = [
        "ro", "com.ro", "org.ro", "it", "es", "pl", "cz", "gr", "pt", "hu", "bg",
        "dk", "no", "fi", "ru", "ua", "by", "tr", "il", "br", "ar", "cl", "mx", "jp", "cn", "kr"
      ];
      if (unsupported.includes(clean) || clean.endsWith(".ro")) return false;
      return true;
    },
    pricing: {
      com: { reg: 10.37, ren: 10.37 },
      io: { reg: 37.82, ren: 37.82 },
      dev: { reg: 12.47, ren: 12.47 },
      app: { reg: 14.15, ren: 14.15 },
      ai: { reg: 74.00, ren: 74.00 },
      org: { reg: 10.74, ren: 10.74 },
      net: { reg: 11.48, ren: 11.48 },
      xyz: { reg: 2.38, ren: 11.98 },
      link: { reg: 5.86, ren: 11.28 },
      tech: { reg: 4.88, ren: 19.88 },
      eu: { reg: 5.99, ren: 7.99 },
      de: { reg: 6.99, ren: 7.99 },
      uk: { reg: 6.85, ren: 6.85 },
      "co.uk": { reg: 6.85, ren: 6.85 },
      default: { reg: 12.00, ren: 12.00 },
    },
  },
  {
    id: "namecheap",
    name: "Namecheap",
    tagline: "One of the most popular domain registrars worldwide",
    description:
      "Founded in 2000, Namecheap manages upwards of 17 million domains worldwide with an extensive ccTLD catalog including .ro, .eu, .de, .uk, and .co.uk. They offer aggressive introductory promotional rates, an intuitive dashboard, free lifetime WhoisGuard domain privacy, and 24/7 responsive live chat customer assistance.",
    badge: "Most Popular",
    badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800",
    logoEmoji: "🏷️",
    whoisPrivacy: "Free Forever",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: false,
      flatRenewal: false,
    },
    highlights: [
      "Free Lifetime WhoisGuard privacy",
      "Supports Romanian (.ro) and European ccTLDs",
      "24/7 responsive live chat support",
      "Large ecosystem of hosting and DNS services",
    ],
    getSearchUrl: (domain: string) =>
      `https://www.namecheap.com/domains/registration/results/?domain=${encodeURIComponent(domain)}`,
    supportsTld: (_tld: string) => true, // Namecheap has universal coverage including .ro
    pricing: {
      com: { reg: 10.28, ren: 14.58 },
      ro: { reg: 12.98, ren: 15.98 },
      io: { reg: 39.98, ren: 44.98 },
      dev: { reg: 14.98, ren: 17.98 },
      app: { reg: 16.98, ren: 19.98 },
      ai: { reg: 79.98, ren: 89.98 },
      org: { reg: 9.98, ren: 14.98 },
      net: { reg: 12.98, ren: 15.98 },
      eu: { reg: 6.98, ren: 9.98 },
      de: { reg: 7.48, ren: 9.98 },
      "co.uk": { reg: 7.48, ren: 9.98 },
      xyz: { reg: 2.98, ren: 13.98 },
      tech: { reg: 3.98, ren: 21.98 },
      default: { reg: 12.98, ren: 16.98 },
    },
  },
  {
    id: "ovhcloud",
    name: "OVHcloud",
    tagline: "Europe's leading cloud hosting & accredited domain registrar",
    description:
      "OVHcloud is the largest hosting provider in Europe and an ICANN-accredited registrar managing millions of domains. They provide native support for .ro, .eu, and major European extensions, bundling free DNSSEC, 1 professional email account, and starter hosting with every registered domain.",
    badge: "Top European Host",
    badgeColor: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-300 dark:border-sky-800",
    logoEmoji: "🌐",
    whoisPrivacy: "Free Forever",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: false,
      flatRenewal: true,
    },
    highlights: [
      "Major European hosting infrastructure",
      "Free starter hosting & email account included",
      "Automated DNSSEC security",
      "Wide European ccTLD catalog (.ro, .eu, .de, .fr)",
    ],
    getSearchUrl: (domain: string) =>
      `https://www.ovhcloud.com/en/domains/order/?domain=${encodeURIComponent(domain)}`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      const ovhTlds = [
        "eu", "fr", "de", "it", "es", "nl", "be", "uk", "co.uk", "pl", "cz", "pt", "ro",
        "com", "net", "org", "info", "biz", "io", "ai", "xyz", "tech", "online", "site", "cloud"
      ];
      return ovhTlds.includes(clean) || clean.endsWith(".ro");
    },
    pricing: {
      ro: { reg: 10.99, ren: 11.99 },
      eu: { reg: 6.49, ren: 8.49 },
      fr: { reg: 6.99, ren: 8.99 },
      de: { reg: 7.99, ren: 9.99 },
      com: { reg: 10.99, ren: 14.99 },
      net: { reg: 12.99, ren: 16.99 },
      org: { reg: 11.99, ren: 15.99 },
      default: { reg: 11.99, ren: 14.99 },
    },
  },
  {
    id: "godaddy",
    name: "GoDaddy",
    tagline: "Global registration powerhouse with 24/7 phone assistance",
    description:
      "GoDaddy is the largest domain name registrar in the world by total domains under management, offering wide support for both generic and country-code extensions worldwide including .ro, .eu, and .co.uk, alongside 24/7 customer assistance.",
    badge: "Major Brand",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800",
    logoEmoji: "🚀",
    whoisPrivacy: "Basic Included",
    features: {
      freePrivacy: false,
      freeDnssec: false,
      zeroMarkup: false,
      flatRenewal: false,
    },
    highlights: [
      "Globally recognized industry brand",
      "Supports Romanian (.ro) and international ccTLDs",
      "Promotional introductory first-year rates",
      "Full suite of marketing tools",
    ],
    getSearchUrl: (domain: string) =>
      `https://www.godaddy.com/domainsearch/find?checkAvail=1&domainToCheck=${encodeURIComponent(domain)}`,
    supportsTld: (_tld: string) => true, // GoDaddy has universal ccTLD catalog
    pricing: {
      com: { reg: 12.17, ren: 22.17 },
      ro: { reg: 11.99, ren: 22.99 },
      io: { reg: 49.99, ren: 59.99 },
      dev: { reg: 19.99, ren: 24.99 },
      app: { reg: 19.99, ren: 24.99 },
      ai: { reg: 89.99, ren: 109.99 },
      org: { reg: 15.17, ren: 22.99 },
      net: { reg: 15.17, ren: 21.99 },
      eu: { reg: 7.99, ren: 16.99 },
      default: { reg: 14.99, ren: 24.99 },
    },
  },
  {
    id: "namesilo",
    name: "NameSilo",
    tagline: "Straightforward domain management with flat renewals",
    description:
      "NameSilo specializes in lean, cost-effective domain registration and bulk portfolio management. They take pride in a simple, no-gimmicks pricing model where renewal prices closely match registration prices without bait-and-switch inflation. Free domain privacy is included on all eligible TLDs forever.",
    badge: "Flat Renewals",
    badgeColor: "bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800",
    logoEmoji: "🛡️",
    whoisPrivacy: "Free Forever",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: false,
      flatRenewal: true,
    },
    highlights: [
      "Free domain privacy forever",
      "Transparent pricing structure",
      "Bulk discount program",
      "No unexpected price increases",
    ],
    getSearchUrl: (domain: string) =>
      `https://www.namesilo.com/domain/search-domains?query=${encodeURIComponent(domain)}`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      const unsupported = [
        "ro", "com.ro", "org.ro", "it", "es", "ch", "at", "pl", "cz", "gr", "pt", "bg",
        "hu", "dk", "no", "fi", "ru", "ua", "br", "mx"
      ];
      if (unsupported.includes(clean) || clean.endsWith(".ro")) return false;
      return true;
    },
    pricing: {
      com: { reg: 10.95, ren: 11.45 },
      io: { reg: 39.99, ren: 42.99 },
      dev: { reg: 13.99, ren: 15.99 },
      app: { reg: 15.99, ren: 17.99 },
      ai: { reg: 78.99, ren: 84.99 },
      org: { reg: 11.79, ren: 12.79 },
      net: { reg: 12.49, ren: 13.49 },
      default: { reg: 12.95, ren: 13.95 },
    },
  },
  {
    id: "dynadot",
    name: "Dynadot",
    tagline: "Advanced registrar with powerful DNS tools and clean UI",
    description:
      "Dynadot is an established registrar praised for its developer-friendly control panel and advanced DNS customization capabilities. Every registered domain includes free full WHOIS privacy protection, free basic website builder integration, sub-account management, and two-factor authentication.",
    badge: "Great DNS",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800",
    logoEmoji: "💠",
    whoisPrivacy: "Free Forever",
    features: {
      freePrivacy: true,
      freeDnssec: true,
      zeroMarkup: false,
      flatRenewal: true,
    },
    highlights: [
      "Free full WHOIS privacy",
      "Comprehensive DNS record manager",
      "Two-factor account security",
      "Free basic landing page builder",
    ],
    getSearchUrl: (domain: string) =>
      `https://www.dynadot.com/domain/search?domain=${encodeURIComponent(domain)}`,
    supportsTld: (tld: string) => {
      const clean = tld.replace(/^\.+/, "").toLowerCase();
      const unsupported = [
        "ro", "com.ro", "org.ro", "pl", "cz", "gr", "pt", "bg", "hu", "dk", "no", "fi", "ru", "ua"
      ];
      if (unsupported.includes(clean) || clean.endsWith(".ro")) return false;
      return true;
    },
    pricing: {
      com: { reg: 10.99, ren: 11.99 },
      io: { reg: 38.99, ren: 41.99 },
      dev: { reg: 13.50, ren: 15.50 },
      app: { reg: 15.00, ren: 17.00 },
      ai: { reg: 75.00, ren: 85.00 },
      org: { reg: 10.99, ren: 12.99 },
      net: { reg: 11.85, ren: 12.85 },
      eu: { reg: 6.99, ren: 8.99 },
      de: { reg: 6.99, ren: 8.99 },
      default: { reg: 12.50, ren: 14.50 },
    },
  },
];

export function getDomainTld(domain: string): string {
  if (!domain) return "com";
  const clean = domain.trim().toLowerCase().replace(/^https?:\/\//, "");
  // Support multi-part TLDs (e.g. .co.uk, .com.au, .org.uk, .com.ro)
  const multiMatch = clean.match(/\.([a-z0-9-]+\.[a-z0-9-]+)$/i);
  if (multiMatch) {
    return multiMatch[1];
  }
  const parts = clean.split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "com";
}

export function isTldSupportedByRegistrar(
  registrar: Registrar,
  tld: string
): boolean {
  if (!tld) return true;
  const clean = tld.trim().toLowerCase().replace(/^\.+/, "");

  if (registrar.supportsTld) {
    return registrar.supportsTld(clean);
  }

  if (registrar.unsupportedTlds && registrar.unsupportedTlds.includes(clean)) {
    return false;
  }

  if (registrar.supportedTlds && registrar.supportedTlds.length > 0) {
    return registrar.supportedTlds.includes(clean);
  }

  return true;
}

export function getRegistrarsForTld(tld: string): Registrar[] {
  const clean = tld.trim().toLowerCase().replace(/^\.+/, "");
  const supported = REGISTRARS.filter((reg) =>
    isTldSupportedByRegistrar(reg, clean)
  );

  // If this TLD has dedicated national or regional registrars (e.g. Hostico or ROTLD for .ro), prioritize them
  return supported.sort((a, b) => {
    const aSpecial =
      Boolean(a.pricing[clean]) ||
      (clean.endsWith("ro") && (a.id === "hostico" || a.id === "rotld"));
    const bSpecial =
      Boolean(b.pricing[clean]) ||
      (clean.endsWith("ro") && (b.id === "hostico" || b.id === "rotld"));
    if (aSpecial && !bSpecial) return -1;
    if (!aSpecial && bSpecial) return 1;
    return 0;
  });
}

export function getRegistrarPriceForTld(
  registrar: Registrar,
  tld: string
): RegistrarPrice {
  const cleanTld = tld.replace(/^\.+/, "").toLowerCase();
  if (registrar.pricing[cleanTld]) {
    return registrar.pricing[cleanTld];
  }
  return registrar.pricing["default"] || { reg: 12.0, ren: 14.0 };
}
