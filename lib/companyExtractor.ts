import { CompanyDetails } from "@/lib/types";

export function extractDeepCompanyInfo(html: string, domain: string): CompanyDetails | null {
  const details: CompanyDetails = {};

  // 1. JSON-LD Schema.org extraction
  const jsonLdMatches = Array.from(
    html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  );

  for (const m of jsonLdMatches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      const items = Array.isArray(parsed) ? parsed : [parsed];

      for (const item of items) {
        if (!item || typeof item !== "object") continue;

        const orgTypes = [
          "Organization",
          "Corporation",
          "LocalBusiness",
          "Store",
          "Company",
          "MedicalBusiness",
          "FinancialService",
          "AutomotiveBusiness",
          "ProfessionalService",
        ];
        const itemType = String(item["@type"] || "");
        const isOrg =
          orgTypes.includes(itemType) ||
          (Array.isArray(item["@type"]) && item["@type"].some((t: string) => orgTypes.includes(t)));

        if (isOrg) {
          if (item.legalName && !details.legalName) details.legalName = String(item.legalName).trim();
          if (item.name && !details.brandName) details.brandName = String(item.name).trim();
          if (item.foundingDate && !details.foundingDate) {
            details.foundingDate = String(item.foundingDate).trim();
            details.operatingSince = String(item.foundingDate).trim();
          }
          if (item.vatID && !details.vatID) details.vatID = String(item.vatID).trim();
          if (item.taxID && !details.taxID) details.taxID = String(item.taxID).trim();
          if (item.email && !details.email) details.email = String(item.email).trim();
          if (item.telephone && !details.telephone) details.telephone = String(item.telephone).trim();

          // Address
          if (item.address && typeof item.address === "object") {
            const addr = item.address;
            const parts = [
              addr.streetAddress,
              addr.addressLocality,
              addr.addressRegion,
              addr.addressCountry,
            ].filter(Boolean);
            if (parts.length > 0 && !details.address) {
              details.address = parts.join(", ");
            }
          }
        }
      }
    } catch {
      // ignore json parse error
    }
  }

  // 2. OpenGraph & Meta tags fallback
  const ogSite = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const appName = html.match(/<meta[^>]*name=["']application-name["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const author = html.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i)?.[1];
  const publisher = html.match(/<meta[^>]*name=["']publisher["'][^>]*content=["']([^"']+)["']/i)?.[1];

  if (ogSite && !details.brandName) details.brandName = ogSite.trim();
  if (appName && !details.brandName) details.brandName = appName.trim();
  if (author && !details.brandName && !author.toLowerCase().includes("admin")) details.brandName = author.trim();
  if (publisher && !details.legalName) details.legalName = publisher.trim();

  // 3. Copyright / Legal Footer Regex fallback
  // Matches "SC CRISTAL L SRL", "Acme Inc.", "XYZ Ltd", "Foo GmbH", "Bar S.A.", etc.
  const legalRegex =
    /(?:copyright|©|\(c\)|&copy;)\s*(?:[0-9]{4}\s*[-–]\s*)?[0-9]{4}?\s*([^<.,\n\r"'\(\)]+?(?:s\.?r\.?l\.?|srl|inc\.?|llc|l\.l\.c\.?|corp\.?|corporation|ltd\.?|limited|gmbh|s\.?a\.?|sa|s\.?p\.?a\.?|co\.?|kft|sp\.?\s*z\s*o\.?o\.?|pte\.?\s*ltd\.?))/i;
  const legalMatch = html.match(legalRegex);
  if (legalMatch && legalMatch[1] && !details.legalName) {
    const cleaned = legalMatch[1].replace(/all rights reserved/i, "").trim();
    if (cleaned.length > 2 && cleaned.length < 65) {
      details.legalName = cleaned;
    }
  }

  // 4. Founding Year / "Since YYYY" or "din YYYY" or "est. YYYY" or "fondat în YYYY"
  const sinceMatch = html.match(/\b(?:since|din|est\.?|established|fondat în|fondat in)\s*(19[0-9]{2}|20[0-2][0-9])\b/i);
  if (sinceMatch && sinceMatch[1] && !details.foundingDate) {
    details.foundingDate = sinceMatch[1];
    details.operatingSince = sinceMatch[1];
  }

  // 5. Fiscal / Tax ID (CUI / CIF / VAT / Tax ID / Company Registration Number)
  const taxMatch = html.match(/\b(?:cui|cif|vat|tax\s*id|registration\s*no\.?|company\s*number)[:\s]+([a-z0-9\s-]{4,18})\b/i);
  if (taxMatch && taxMatch[1] && !details.taxID) {
    const cleanTax = taxMatch[1].trim();
    if (/^[A-Z]{0,2}[0-9]{5,14}$/i.test(cleanTax.replace(/\s+/g, ""))) {
      details.taxID = cleanTax;
      if (!details.vatID && /^RO/i.test(cleanTax)) details.vatID = cleanTax;
    }
  }

  // 6. Registration Number (e.g. J40/1234/2020 in Romania or similar company registry numbers)
  const regMatch = html.match(/\b([jfc][0-9]{1,2}\/[0-9]+\/[0-9]{4})\b/i);
  if (regMatch && regMatch[1] && !details.taxID) {
    details.taxID = `Reg. Com. ${regMatch[1].toUpperCase()}`;
  }

  const hasAnyInfo =
    details.legalName ||
    details.brandName ||
    details.vatID ||
    details.taxID ||
    details.foundingDate ||
    details.address;

  return hasAnyInfo ? details : null;
}
