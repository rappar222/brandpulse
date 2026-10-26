export type CheckStatus = "available" | "taken" | "unknown";

export type Category = "Domains" | "Package Registries" | "Social & Platforms";

export type ActiveTab = "All" | Category | "Wikipedia" | "Trademark";

export type PersonaMode = "all" | "startup" | "developer";

export interface CheckResult {
  platform: string;
  category: Category;
  status: CheckStatus;
  url: string;
  latencyMs?: number;
  message?: string;
  handleTested?: string;
}

export interface CheckApiResponse {
  name: string;
  sanitized: string;
  timestamp: string;
  summary: {
    total: number;
    available: number;
    taken: number;
    unknown: number;
  };
  results: CheckResult[];
  suggestions: string[];
}

export interface WikiAiSummary {
  entityType: string;
  collisionRisk: "High" | "Moderate" | "Low";
  collisionNote: string;
  keyPoints: string[];
}

export type WebSummaryTier =
  | "Requested / Custom TLD"
  | "Popular TLD"
  | "Country & Territory Code"
  | "Specialty & Generic gTLD";

export interface WebSummaryResult {
  domain: string;
  url: string;
  title: string;
  description: string;
  h1?: string;
  paragraphs?: string[];
  ogImage?: string | null;
  isParked: boolean;
  isAccessible?: boolean;
  hasWhois?: boolean;
  isUnknown?: boolean;
  tld: string;
  tier?: WebSummaryTier;
  companyInfo?: CompanyDetails;
  aiSummary: {
    entityType: string;
    siteSummary: string;
    keyPoints: string[];
    statusNote: string;
  };
}

export interface CheckHostDetails {
  ok: boolean;
  domain: string;
  ip?: string;
  hostName?: string;
  ipRange?: string;
  asn?: string;
  isp?: string;
  country?: string;
  flagUrl?: string | null;
  region?: string;
  city?: string;
  registrar?: string;
  registeredDate?: string;
  expiryDate?: string;
  domainStatus?: string[];
  nameservers?: string[];
  isParkedOrHeld?: boolean;
  error?: string;
  checkHostUrl: string;
  pingUrl: string;
  httpUrl: string;
  dnsUrl: string;
  tcpUrl: string;
}

export interface CompanyDetails {
  legalName?: string;
  brandName?: string;
  foundingDate?: string;
  operatingSince?: string;
  vatID?: string;
  taxID?: string;
  address?: string;
  email?: string;
  telephone?: string;
  industry?: string;
}

export interface TrademarkConflictItem {
  source: string;
  title: string;
  description: string;
  url: string;
  type: "Corporate Entity" | "Software / App" | "Trademark / Brand";
  companyInfo?: CompanyDetails;
}

export interface TrademarkCheckResult {
  query: string;
  riskLevel: "High" | "Medium" | "Low";
  riskSummary: string;
  conflicts: TrademarkConflictItem[];
  officialDirectories: Array<{
    id: string;
    name: string;
    region: string;
    url: string;
    description: string;
  }>;
}

export interface ShortlistBrandItem {
  name: string;
  addedAt: string;
  score: number;
  comStatus: CheckStatus;
  aiStatus: CheckStatus;
  ioStatus: CheckStatus;
  domainsAvailable: number;
  domainsTotal: number;
  socialsAvailable: number;
  socialsTotal: number;
  packagesAvailable: number;
  packagesTotal: number;
}

export interface WikiSummaryResult {
  found: boolean;
  source?: "wikipedia" | "website" | "none";
  query: string;
  message?: string;
  title?: string;
  description?: string;
  extract?: string;
  url?: string;
  thumbnail?: string | null;
  aiSummary?: WikiAiSummary;
  websiteSummary?: WebSummaryResult | null;
  allWebsites?: WebSummaryResult[];
}
