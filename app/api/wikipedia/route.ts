import { NextRequest, NextResponse } from "next/server";
import { WikiSummaryResult, WebSummaryResult, WebSummaryTier } from "@/lib/types";
import { extractDeepCompanyInfo } from "@/lib/companyExtractor";

const WIKI_USER_AGENT =
  "BrandPulseAvailabilityChecker/1.0 (https://brandpulse.local; contact@brandpulse.local)";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getBaseTitle(title: string): string {
  let base = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
  base = base.replace(/,?\s*(inc\.?|llc|corp\.?|corporation|ltd\.?)$/i, "").trim();
  return base;
}

function isMatchingTitle(candidateTitle: string, query: string): boolean {
  const normQuery = normalize(query);
  const normCand = normalize(candidateTitle);
  const normBase = normalize(getBaseTitle(candidateTitle));

  if (!normQuery) return false;

  return normCand === normQuery || normBase === normQuery;
}

function synthesizeWikiAi(title: string, desc: string, extract: string) {
  const text = `${desc} ${extract}`.toLowerCase();

  let entityType = "General Topic / Named Concept";
  if (
    /\b(surname|given name|family name)\b/i.test(title) ||
    /surname list|is a surname|is a given name|is a family name/i.test(text)
  ) {
    entityType = "Surname / Personal Name";
  } else if (
    /\b(company|corporation|conglomerate|subsidiary|firm|enterprise)\b|founded in|headquartered/i.test(
      text
    )
  ) {
    entityType = "Company / Corporation";
  } else if (
    /software|library|framework|programming language|open-source|database|tool|application|operating system|web framework|runtime/i.test(
      text
    )
  ) {
    entityType = "Technology / Software";
  } else if (/protocol|standard|specification|cryptographic|network/i.test(text)) {
    entityType = "Protocol / Standard";
  } else if (/product|brand|beverage|food|apparel|vehicle|device|hardware/i.test(text)) {
    entityType = "Commercial Product / Brand";
  } else if (/organization|non-profit|foundation|association|institute/i.test(text)) {
    entityType = "Organization / Foundation";
  } else if (/musician|band|singer|actor|artist|writer|politician|person/i.test(text)) {
    entityType = "Public Figure / Media";
  }

  let collisionRisk: "High" | "Moderate" | "Low" = "Moderate";
  let collisionNote =
    "A notable Wikipedia entry exists for this exact term. Naming conflicts may arise depending on commercial trademark classification.";

  if (entityType === "Technology / Software" || entityType === "Company / Corporation") {
    collisionRisk = "High";
    collisionNote =
      "An active technology entity or registered commercial enterprise exists under this title. High likelihood of trademark protection and brand confusion.";
  } else if (entityType === "Surname / Personal Name") {
    collisionRisk = "Moderate";
    collisionNote =
      "This title represents a recognized surname or personal name. Trademark conflict risk is low unless registered as a proprietary mark in your commercial class.";
  }

  const sentences = extract
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const keyPoints: string[] = [];
  if (sentences[0]) {
    keyPoints.push(sentences[0]);
  }
  if (sentences.length > 1 && sentences[1].length > 15) {
    keyPoints.push(sentences[1]);
  }
  if (desc && !keyPoints.some((p) => p.toLowerCase().includes(desc.toLowerCase()))) {
    keyPoints.push(`Wikipedia classification: ${desc}.`);
  }

  return {
    entityType,
    collisionRisk,
    collisionNote,
    keyPoints,
  };
}

function isParkedOrEmpty(html: string, title: string, desc: string): boolean {
  const combined = `${html} ${title} ${desc}`.toLowerCase();
  return /parking-lander|parkweb|lander_type|sedoparking|hugedomains|bodis\.com|afternic|dan\.com|parked free|domain.*for sale|buy this domain|inquire.*domain|renew this domain|domain has expired|this domain is parked|domain is available for sale|\/lander\b|location\.(href|replace).*lander/i.test(
    combined
  );
}

function extractHtmlMetadata(html: string, domain: string) {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";

  const descMatch =
    html.match(/<meta[^>]*name=["\x27]description["\x27][^>]*content=["\x27]([^"\x27]+)["\x27]/i) ||
    html.match(/<meta[^>]*content=["\x27]([^"\x27]+)["\x27][^>]*name=["\x27]description["\x27]/i) ||
    html.match(/<meta[^>]*property=["\x27]og:description["\x27][^>]*content=["\x27]([^"\x27]+)["\x27]/i);
  const description = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "";

  const ogImageMatch =
    html.match(/<meta[^>]*property=["\x27]og:image["\x27][^>]*content=["\x27]([^"\x27]+)["\x27]/i) ||
    html.match(/<meta[^>]*name=["\x27]twitter:image["\x27][^>]*content=["\x27]([^"\x27]+)["\x27]/i);
  const ogImage = ogImageMatch ? ogImageMatch[1].trim() : null;

  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match
    ? h1Match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    : "";

  const pMatches = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi));
  const paragraphs = pMatches
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(
      (p) =>
        p.length > 25 &&
        !/cookie|javascript|privacy policy|terms of use|all rights reserved/i.test(p)
    )
    .slice(0, 3);

  const isLanderRedirect = /location\.(href|replace)\s*=\s*["'][^"']*(lander|park|forsale)/i.test(html);
  const isParked = isParkedOrEmpty(html, title, description) || isLanderRedirect;

  const finalTitle = title || (isParked ? `${domain} (Parking / Domain Acquisition Lander)` : "");
  const finalDescription =
    description ||
    (isParked
      ? `Domain ${domain} is actively registered and currently parked or offered for acquisition via marketplace lander.`
      : "");

  return { title: finalTitle, description: finalDescription, h1, paragraphs, ogImage, isParked };
}

async function checkDnsStatus(domain: string): Promise<{
  exists: boolean;
  isNxdomain: boolean;
  ip?: string;
  nameservers?: string[];
}> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2200);
    const [resA, resNS] = await Promise.all([
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=A`, {
        headers: { Accept: "application/dns-json" },
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`, {
        headers: { Accept: "application/dns-json" },
        signal: controller.signal,
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]);
    clearTimeout(timeout);

    const isNxdomain = resA?.Status === 3 || resNS?.Status === 3;
    const hasA = resA?.Status === 0 && Array.isArray(resA?.Answer) && resA.Answer.length > 0;
    const hasNS = resNS?.Status === 0 && Array.isArray(resNS?.Answer) && resNS.Answer.length > 0;

    const ip = hasA ? resA.Answer.find((a: any) => a.type === 1)?.data : undefined;
    const nameservers = hasNS
      ? resNS.Answer.map((a: any) => String(a.data || "").replace(/\.$/, "").toLowerCase())
      : undefined;

    return {
      exists: hasA || hasNS,
      isNxdomain: isNxdomain && !hasA && !hasNS,
      ip,
      nameservers,
    };
  } catch {
    return { exists: false, isNxdomain: false };
  }
}

async function checkWhoisPresence(domain: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
      signal: controller.signal,
      headers: { Accept: "application/rdap+json, application/json" },
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return false;
    const data = await res.json();
    const hasRegistrar =
      Array.isArray(data?.entities) &&
      data.entities.some((e: any) => Array.isArray(e.roles) && e.roles.includes("registrar"));
    const hasDates =
      Array.isArray(data?.events) &&
      data.events.some((ev: any) => ev.eventAction === "registration" || ev.eventAction === "expiration");
    return Boolean(hasRegistrar || hasDates);
  } catch {
    return false;
  }
}

async function probeDomain(domain: string) {
  // 1. Fast DNS status check
  const dnsStatus = await checkDnsStatus(domain);
  if (dnsStatus.isNxdomain) {
    return null;
  }

  const nsList = dnsStatus.nameservers || [];
  const nsString = nsList.join(" ").toLowerCase();
  const isParkedNs =
    nsString.includes("sedoparking") ||
    nsString.includes("bodis") ||
    nsString.includes("afternic") ||
    nsString.includes("dan.com") ||
    nsString.includes("parkingcrew") ||
    nsString.includes("hugedomains");

  // 2. Attempt HTTP / HTTPS fetch to extract rich site content
  let serverName = "";
  const fetchWithUrl = async (url: string) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeout);
      if (res.headers.get("server")) {
        serverName = res.headers.get("server") || "";
      }

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("html") || contentType.includes("text")) {
          const html = await res.text();
          const meta = extractHtmlMetadata(html, domain);
          const companyInfo = extractDeepCompanyInfo(html, domain);
          if (meta.title || meta.description) {
            return {
              domain,
              url: res.url,
              companyInfo: companyInfo || undefined,
              isAccessible: true,
              hasWhois: true,
              isUnknown: false,
              ...meta,
            };
          }
        }
      }

      return null;
    } catch {
      return null;
    }
  };

  const httpsRes = await fetchWithUrl(`https://${domain}`);
  if (httpsRes) return httpsRes;

  const httpRes = await fetchWithUrl(`http://${domain}`);
  if (httpRes) return httpRes;

  // 3. Fallback: if HTTP content couldn't be parsed or returned non-200,
  // but DNS confirms the domain exists with active A or NS records:
  if (dnsStatus.exists) {
    const hasWhois = isParkedNs ? true : await checkWhoisPresence(domain);
    const isUnknown = !isParkedNs && !hasWhois;

    const title = isUnknown
      ? `${domain} (Unaccessible Web Host)`
      : `${domain} (${serverName ? `Active ${serverName.split("/")[0]} Server` : "Active Registered Domain"})`;
    const description = isUnknown
      ? `Domain ${domain} is registered in DNS, but has no accessible HTTP/HTTPS website and no public WHOIS registration data could be retrieved.`
      : `Domain is actively registered and delegated${
          dnsStatus.ip ? ` to host IP ${dnsStatus.ip}` : ""
        }${nsList.length ? ` (Nameservers: ${nsList.slice(0, 2).join(", ")})` : ""}.${
          serverName ? ` Web server running: ${serverName}.` : ""
        }`;
    const h1 = `${domain} Web Infrastructure`;
    const paragraphs = [
      `Registered DNS zone hosted at ${dnsStatus.ip || "configured nameservers"}. Active nameservers: ${
        nsList.join(", ") || "Active DNS"
      }.${serverName ? ` Server responded with ${serverName}.` : ""}`,
    ];

    return {
      domain,
      url: `https://${domain}`,
      title,
      description,
      h1,
      paragraphs,
      ogImage: null,
      isParked: isParkedNs,
      isAccessible: false,
      hasWhois,
      isUnknown,
    };
  }

  return null;
}

function synthesizeWebsiteAi(
  domain: string,
  title: string,
  desc: string,
  h1: string,
  paragraphs: string[],
  isParked: boolean,
  isUnknown?: boolean,
  lang: string = "en"
) {
  const l = (lang || "en").toLowerCase();
  const text = `${domain} ${title} ${desc} ${h1} ${paragraphs.join(" ")}`.toLowerCase();

  const ENTITY_TYPE_MAP: Record<string, Record<string, string>> = {
    web_app: {
      en: "Web Application / Digital Platform",
      ro: "Aplicație Web / Platformă Digitală",
      de: "Webanwendung / Digitale Plattform",
      fr: "Application Web / Plateforme numérique",
      es: "Aplicación Web / Plataforma Digital",
      it: "Applicazione Web / Piattaforma Digitale",
      pt: "Aplicação Web / Plataforma Digital",
      ja: "Webアプリケーション / デジタルプラットフォーム",
      zh: "Web应用 / 数字平台",
      ko: "웹 애플리케이션 / 디지털 플랫폼",
    },
    unaccessible: {
      en: "Unaccessible Host (No WHOIS Data)",
      ro: "Gazdă Inaccesibilă (Fără Date WHOIS)",
      de: "Unerreichbarer Host (Keine WHOIS-Daten)",
      fr: "Hôte inaccessible (Aucune donnée WHOIS)",
      es: "Host inaccesible (Sin datos WHOIS)",
      it: "Host inaccessibile (Nessun dato WHOIS)",
      pt: "Host inacessível (Sem dados WHOIS)",
      ja: "アクセス不能なホスト（WHOIS情報なし）",
      zh: "无法访问的主机（无WHOIS数据）",
      ko: "접근 불가능한 호스트 (WHOIS 정보 없음)",
    },
    parked: {
      en: "Parked Domain / Available for Sale",
      ro: "Domeniu Parcat / Disponibil spre Vânzare",
      de: "Geparkte Domain / Zum Verkauf",
      fr: "Domaine parqué / Disponible à la vente",
      es: "Dominio aparcado / Disponible para la venta",
      it: "Dominio parcheggiato / Disponibile per l'acquisto",
      pt: "Domínio estacionado / Disponível para venda",
      ja: "パーキング中ドメイン / 販売中",
      zh: "停放域名 / 可供出售",
      ko: "파킹된 도메인 / 판매 중",
    },
    manufacturing: {
      en: "Commercial Atelier & Custom Manufacturing",
      ro: "Atelier Comercial & Producție Personalizată",
      de: "Gewerbliches Atelier & Maßfertigung",
      fr: "Atelier commercial et fabrication sur mesure",
      es: "Taller comercial y fabricación a medida",
      it: "Atelier commerciale e produzione personalizzata",
      pt: "Ateliê comercial e fabricação sob medida",
      ja: "カスタム製作工房・商業アトリエ",
      zh: "定制工坊与商业制造",
      ko: "맞춤 제작 공방 및 상업용 아틀리에",
    },
    infra: {
      en: "Web Server & Infrastructure",
      ro: "Server Web & Infrastructură",
      de: "Webserver & Infrastruktur",
      fr: "Serveur Web & Infrastructure",
      es: "Servidor Web e Infraestructura",
      it: "Server Web e Infrastruttura",
      pt: "Servidor Web e Infraestrutura",
      ja: "Webサーバー＆インフラ",
      zh: "Web服务器与基础设施",
      ko: "웹 서버 및 인프라",
    },
    data: {
      en: "Data Infrastructure & Analytics",
      ro: "Infrastructură de Date & Analitică",
      de: "Dateninfrastruktur & Analytik",
      fr: "Infrastructure de données & Analytique",
      es: "Infraestructura de datos y analítica",
      it: "Infrastruttura dati e analisi",
      pt: "Infraestrutura de dados e análise",
      ja: "データインフラ＆分析基盤",
      zh: "数据基础设施与分析",
      ko: "데이터 인프라 및 분석 플랫폼",
    },
    dev_tool: {
      en: "Developer Tool / Software Engine",
      ro: "Instrument pentru Dezvoltatori / Motor Software",
      de: "Entwickler-Tool / Software-Engine",
      fr: "Outil pour développeurs / Moteur logiciel",
      es: "Herramienta de desarrollo / Motor de software",
      it: "Strumento per sviluppatori / Motore software",
      pt: "Ferramenta de desenvolvedor / Motor de software",
      ja: "開発者ツール / ソフトウェアエンジン",
      zh: "开发者工具 / 软件引擎",
      ko: "개발자 도구 / 소프트웨어 엔진",
    },
    saas: {
      en: "SaaS & Cloud Platform",
      ro: "Platformă SaaS & Cloud",
      de: "SaaS- & Cloud-Plattform",
      fr: "Plateforme SaaS & Cloud",
      es: "Plataforma SaaS y Cloud",
      it: "Piattaforma SaaS & Cloud",
      pt: "Plataforma SaaS e Nuvem",
      ja: "SaaS＆クラウドプラットフォーム",
      zh: "SaaS与云平台",
      ko: "SaaS 및 클라우드 플랫폼",
    },
    ecommerce: {
      en: "E-Commerce / Consumer Brand",
      ro: "E-Commerce / Brand de Consum",
      de: "E-Commerce / Verbrauchermarke",
      fr: "E-commerce / Marque grand public",
      es: "Comercio electrónico / Marca de consumo",
      it: "E-Commerce / Marchio di consumo",
      pt: "E-Commerce / Marca de consumo",
      ja: "Eコマース / コンシューマーブランド",
      zh: "电子商务 / 消费品牌",
      ko: "이커머스 / 소비자 브랜드",
    },
    agency: {
      en: "Agency / Professional Services",
      ro: "Agenție / Servicii Profesionale",
      de: "Agentur / Professionelle Dienstleistungen",
      fr: "Agence / Services professionnels",
      es: "Agencia / Servicios Profesionales",
      it: "Agenzia / Servizi Professionali",
      pt: "Agência / Serviços Profissionais",
      ja: "エージェンシー / プロフェッショナルサービス",
      zh: "专业咨询与代理服务",
      ko: "에이전시 / 전문 서비스",
    },
    fintech: {
      en: "Fintech & Web3",
      ro: "Fintech & Web3",
      de: "Fintech & Web3",
      fr: "Fintech & Web3",
      es: "Fintech y Web3",
      it: "Fintech & Web3",
      pt: "Fintech e Web3",
      ja: "フィンテック＆Web3",
      zh: "金融科技与Web3",
      ko: "핀테크 & Web3",
    },
  };

  let typeKey = "web_app";
  if (isUnknown) {
    typeKey = "unaccessible";
  } else if (isParked) {
    typeKey = "parked";
  } else if (/\b(atelier|stampile|gravura|trofee|print|tipografie|magazin|craft|custom\s*products|merchandise|engraving|trophies)\b/i.test(text)) {
    typeKey = "manufacturing";
  } else if (/server|infrastructure|host|nginx|apache|dns delegation|nameserver/i.test(text)) {
    typeKey = "infra";
  } else if (/lakehouse|database|analytics|data platform|pipeline|engine|infrastructure|compute/i.test(text)) {
    typeKey = "data";
  } else if (/\b(developer|api|sdk|framework|library|open-source|cli|source-code)\b/i.test(text)) {
    typeKey = "dev_tool";
  } else if (/saas|software|platform|workflow|productivity|cloud/i.test(text)) {
    typeKey = "saas";
  } else if (/shop|store|apparel|buy|cart|checkout|ecommerce|brand|merch/i.test(text)) {
    typeKey = "ecommerce";
  } else if (/agency|consulting|studio|services|solutions/i.test(text)) {
    typeKey = "agency";
  } else if (/finance|crypto|token|wallet|invest|trading|defi/i.test(text)) {
    typeKey = "fintech";
  }

  const entityType = ENTITY_TYPE_MAP[typeKey]?.[l] || ENTITY_TYPE_MAP[typeKey]?.en || ENTITY_TYPE_MAP.web_app.en;

  // Localized prefixes
  const PREFIXES: Record<string, { title: string; prop: string; headline: string; lead: string; fallback: string }> = {
    en: { title: "Site Title:", prop: "Core Proposition:", headline: "Main Headline:", lead: "Lead Extract:", fallback: `Live website deployed and active on ${domain}.` },
    ro: { title: "Titlul Site-ului:", prop: "Propunere Centrală:", headline: "Titlu Principal:", lead: "Extras Principal:", fallback: `Site web activ implementat și funcțional pe ${domain}.` },
    de: { title: "Website-Titel:", prop: "Kernversprechen:", headline: "Hauptüberschrift:", lead: "Leittext-Auszug:", fallback: `Aktive Website bereitgestellt und in Betrieb auf ${domain}.` },
    fr: { title: "Titre du site :", prop: "Proposition de valeur :", headline: "Titre principal :", lead: "Extrait principal :", fallback: `Site web actif déployé et fonctionnel sur ${domain}.` },
    es: { title: "Título del sitio:", prop: "Propuesta central:", headline: "Titular principal:", lead: "Extracto introductorio:", fallback: `Sitio web activo implementado y funcionando en ${domain}.` },
    it: { title: "Titolo del sito:", prop: "Proposta centrale:", headline: "Titolo principale:", lead: "Estratto introduttivo:", fallback: `Sito web attivo implementato e funzionante su ${domain}.` },
    pt: { title: "Título do site:", prop: "Proposta central:", headline: "Manchete principal:", lead: "Extrato introdutório:", fallback: `Site ativo implantado e funcionando em ${domain}.` },
    ja: { title: "サイトタイトル:", prop: "コアバリュー:", headline: "メインヘッドライン:", lead: "リード抜粋:", fallback: `${domain} でWebサイトが本番稼働中です。` },
    zh: { title: "网站标题:", prop: "核心主张:", headline: "主标题:", lead: "导语摘要:", fallback: `正式网站已部署并在 ${domain} 正常运行。` },
    ko: { title: "웹사이트 제목:", prop: "핵심 가치 제안:", headline: "메인 헤드라인:", lead: "핵심 발췌:", fallback: `${domain}에서 실제 웹사이트가 배포되어 운영 중입니다.` },
  };

  const p = PREFIXES[l] || PREFIXES.en;

  const keyPoints: string[] = [];
  if (title) {
    keyPoints.push(`${p.title} "${title}"`);
  }
  if (desc) {
    keyPoints.push(`${p.prop} ${desc}`);
  }
  if (h1 && h1.toLowerCase() !== title.toLowerCase()) {
    keyPoints.push(`${p.headline} "${h1}"`);
  }
  if (paragraphs.length > 0) {
    const cleanP = paragraphs[0].slice(0, 160).trim();
    keyPoints.push(`${p.lead} "${cleanP}${paragraphs[0].length > 160 ? "..." : ""}"`);
  }

  if (keyPoints.length < 2 && !desc) {
    keyPoints.push(p.fallback);
  }

  const STATUS_NOTES: Record<string, { unknown: string; parked: string; active: string }> = {
    en: {
      unknown: `The domain ${domain} is currently unaccessible over HTTP/HTTPS and no public WHOIS registration data could be retrieved.`,
      parked: `The domain ${domain} is currently parked or offered for acquisition.`,
      active: `Active production site operating on ${domain}. Brand presence is claimed and active on this TLD.`,
    },
    ro: {
      unknown: `Domeniul ${domain} este momentan inaccesibil prin HTTP/HTTPS și nu au putut fi preluate date publice WHOIS.`,
      parked: `Domeniul ${domain} este momentan parcat sau oferit spre vânzare.`,
      active: `Site activ în producție care funcționează pe ${domain}. Prezența mărcii este revendicată și activă pe acest TLD.`,
    },
    de: {
      unknown: `Die Domain ${domain} ist derzeit über HTTP/HTTPS nicht erreichbar und es konnten keine öffentlichen WHOIS-Daten abgerufen werden.`,
      parked: `Die Domain ${domain} ist derzeit geparkt oder steht zum Verkauf.`,
      active: `Aktive Produktionswebsite in Betrieb auf ${domain}. Markenpräsenz ist beansprucht und aktiv auf dieser TLD.`,
    },
    fr: {
      unknown: `Le domaine ${domain} est actuellement inaccessible via HTTP/HTTPS et aucune donnée WHOIS publique n'a pu être récupérée.`,
      parked: `Le domaine ${domain} est actuellement parqué ou proposé à l'achat.`,
      active: `Site de production actif fonctionnant sur ${domain}. La présence de marque est revendiquée et active sur ce TLD.`,
    },
    es: {
      unknown: `El dominio ${domain} actualmente no es accesible a través de HTTP/HTTPS y no se pudieron recuperar datos públicos de WHOIS.`,
      parked: `El dominio ${domain} actualmente está aparcado u ofrecido para su adquisición.`,
      active: `Sitio de producción activo operando en ${domain}. La presencia de marca está reclamada y activa en este TLD.`,
    },
    it: {
      unknown: `Il dominio ${domain} non è attualmente accessibile tramite HTTP/HTTPS e non è stato possibile recuperare dati WHOIS pubblici.`,
      parked: `Il dominio ${domain} è attualmente parcheggiato o in vendita.`,
      active: `Sito di produzione attivo operativo su ${domain}. La presenza del marchio è rivendicata e attiva su questo TLD.`,
    },
    pt: {
      unknown: `O domínio ${domain} está atualmente inacessível via HTTP/HTTPS e nenhum dado público de WHOIS pôde ser recuperado.`,
      parked: `O domínio ${domain} está atualmente estacionado ou disponível para aquisição.`,
      active: `Site de produção ativo operando em ${domain}. Presença de marca reivindicada e ativa neste TLD.`,
    },
    ja: {
      unknown: `ドメイン ${domain} は現在HTTP/HTTPSでアクセス不能であり、公開WHOIS情報を取得できません。`,
      parked: `ドメイン ${domain} は現在パーキング中または購入可能です。`,
      active: `稼働中のWebサイトが ${domain} で運用されています。このTLDでブランドが確立され、利用されています。`,
    },
    zh: {
      unknown: `域名 ${domain} 目前无法通过HTTP/HTTPS访问，且无法检索到公开WHOIS注册数据。`,
      parked: `域名 ${domain} 目前处于停放状态或正在出售。`,
      active: `正式生产环境网站正在 ${domain} 运行。该品牌在此顶级域名上已建立并保持活跃。`,
    },
    ko: {
      unknown: `${domain} 도메인은 현재 HTTP/HTTPS로 접근할 수 없으며 공개 WHOIS 등록 정보를 검색할 수 없습니다.`,
      parked: `${domain} 도메인은 현재 파킹되어 있거나 양도/구매 가능합니다.`,
      active: `${domain}에서 활성 사이트가 운영 중입니다. 이 TLD에서 브랜드가 등록되어 활발히 운영되고 있습니다.`,
    },
  };

  const notes = STATUS_NOTES[l] || STATUS_NOTES.en;
  const statusNote = isUnknown ? notes.unknown : isParked ? notes.parked : notes.active;

  return {
    entityType,
    siteSummary: desc || title || `Active web property on ${domain}`,
    keyPoints,
    statusNote,
  };
}

async function findAllWebsites(
  name: string,
  requestedTlds: string[] = [],
  lang: string = "en"
): Promise<{ best: WebSummaryResult | null; all: WebSummaryResult[] }> {
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (!clean) return { best: null, all: [] };

  // Progressive Tiers:
  // Tier 0: User-Requested / Custom TLDs (e.g. .ro, .co.uk if typed or configured)
  // Tier 1: Popular Global TLDs (.com, .io, .ai, .app, .dev, .org, .co, .net)
  // Tier 2: Country & Territory Codes (.ro, .me, .uk, .de, .ca, .fr, .eu, .co.uk...)
  // Tier 3: Specialized & Generic gTLDs (.market, .tech, .xyz...)
  const cleanRequested = requestedTlds
    .map((t) => t.trim().toLowerCase().replace(/^\.+/, ""))
    .filter(Boolean);

  const tiers: Array<{
    name: WebSummaryTier;
    tlds: string[];
    baseWeight: number;
  }> = [];

  // Tier 0: Custom / Requested
  if (cleanRequested.length > 0) {
    tiers.push({
      name: "Requested / Custom TLD",
      tlds: cleanRequested,
      baseWeight: 45,
    });
  }

  // Tier 1: Popular
  tiers.push({
    name: "Popular TLD",
    tlds: ["com", "xyz", "io", "ai", "app", "dev", "org", "co", "net"],
    baseWeight: 30,
  });

  // Tier 2: Country Code & Territory ccTLDs
  tiers.push({
    name: "Country & Territory Code",
    tlds: [
      "ro",
      "co.uk",
      "me",
      "de",
      "uk",
      "fr",
      "eu",
      "it",
      "es",
      "nl",
      "pl",
      "ch",
      "at",
      "be",
      "se",
      "no",
      "dk",
      "fi",
      "ie",
      "pt",
      "cz",
      "gr",
      "hu",
      "bg",
      "hr",
      "sk",
      "ca",
      "in",
      "au",
      "jp",
      "br",
      "us",
      "sg",
      "nz",
      "mx",
      "tv",
      "cc",
      "to",
      "is",
      "so",
    ],
    baseWeight: 22,
  });

  // Tier 3: Specialized & Generic gTLDs
  tiers.push({
    name: "Specialty & Generic gTLD",
    tlds: [
      "market",
      "tech",
      "xyz",
      "online",
      "store",
      "digital",
      "cloud",
      "software",
      "agency",
      "studio",
      "space",
      "site",
      "pro",
      "global",
      "world",
      "zone",
      "club",
    ],
    baseWeight: 14,
  });

  const discoveredAuthentic: WebSummaryResult[] = [];
  const discoveredParked: WebSummaryResult[] = [];
  const seenDomains = new Set<string>();

  // Probe tiers
  for (const tier of tiers) {
    const probes = tier.tlds.map(async (tld, index) => {
      const domain = `${clean}.${tld}`;
      if (seenDomains.has(domain)) return null;
      seenDomains.add(domain);

      const result = await probeDomain(domain);
      if (!result) return null;

      let score = tier.baseWeight - index * 0.3;
      if (result.title && result.title.length > 2) score += 30;
      if (result.description && result.description.length > 10) score += 35;
      if (result.h1) score += 15;
      if (result.paragraphs && result.paragraphs.length > 0) score += 10;
      if (result.isParked) score -= 75;

      return { ...result, score, tld, tier: tier.name };
    });

    const tierResults = (await Promise.all(probes)).filter(Boolean) as Array<
      NonNullable<Awaited<ReturnType<typeof probeDomain>>> & {
        score: number;
        tld: string;
        tier: WebSummaryTier;
      }
    >;

    for (const r of tierResults) {
      const isUnknown = Boolean((r as any).isUnknown);
      const isAccessible = Boolean((r as any).isAccessible);
      const hasWhois = Boolean((r as any).hasWhois);

      const aiSummary = synthesizeWebsiteAi(
        r.domain,
        r.title,
        r.description,
        r.h1,
        r.paragraphs,
        r.isParked,
        isUnknown,
        lang
      );

      const summaryObj: WebSummaryResult = {
        domain: r.domain,
        url: r.url,
        title: r.title || r.domain,
        description: r.description || r.title || (r.isParked ? `Parked domain ${r.domain}` : `Active web property on ${r.domain}`),
        h1: r.h1,
        paragraphs: r.paragraphs,
        ogImage: r.ogImage,
        isParked: r.isParked,
        isAccessible,
        hasWhois,
        isUnknown,
        tld: r.tld,
        tier: r.tier,
        companyInfo: (r as any).companyInfo,
        aiSummary,
      };

      if (!r.isParked && !isUnknown) {
        discoveredAuthentic.push(summaryObj);
      } else {
        discoveredParked.push(summaryObj);
      }
    }
  }

  // Combine all discovered websites: authentic first, followed by parked / acquisition properties
  const allWebsites = [...discoveredAuthentic, ...discoveredParked];

  // If a specific TLD was requested or typed by the user, prioritize it as the primary result
  const requestedMatch =
    cleanRequested.length > 0
      ? allWebsites.find((s) => cleanRequested.includes(s.tld.toLowerCase()))
      : null;

  if (requestedMatch && allWebsites.length > 0 && allWebsites[0].domain !== requestedMatch.domain) {
    const idx = allWebsites.findIndex((s) => s.domain === requestedMatch.domain);
    if (idx > -1) {
      allWebsites.splice(idx, 1);
      allWebsites.unshift(requestedMatch);
    }
  }

  const best = requestedMatch || (allWebsites.length > 0 ? allWebsites[0] : null);

  return { best, all: allWebsites };
}

async function findWikipediaArticle(cleanQ: string, lang: string = "en"): Promise<any> {
  const l = (lang || "en").toLowerCase();
  const wikiHost = ["ro", "de", "fr", "es", "it", "pt", "ja", "zh", "ko"].includes(l)
    ? `${l}.wikipedia.org`
    : "en.wikipedia.org";

  const tryTitle = async (title: string, host: string = wikiHost) => {
    try {
      const res = await fetch(
        `https://${host}/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
        {
          headers: {
            "User-Agent": WIKI_USER_AGENT,
            Accept: "application/json",
          },
          next: { revalidate: 3600 },
        }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.type === "standard" && data.extract && data.extract.trim().length > 0) {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  };

  // 1. Try exact query
  const exactData = await tryTitle(cleanQ);
  if (exactData && isMatchingTitle(exactData.title, cleanQ)) {
    return exactData;
  }

  // 2. Try capitalized query (e.g. "stripe" -> "Stripe")
  const capitalized = cleanQ.charAt(0).toUpperCase() + cleanQ.slice(1);
  const capData = await tryTitle(capitalized);
  if (capData && isMatchingTitle(capData.title, cleanQ)) {
    return capData;
  }

  // 3. Search via MediaWiki API — but strictly filter for exact title match
  try {
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        cleanQ
      )}&utf8=&format=json&srlimit=8`,
      {
        headers: { "User-Agent": WIKI_USER_AGENT },
        next: { revalidate: 3600 },
      }
    );

    if (searchRes.ok) {
      const searchJson = await searchRes.json();
      const hits: Array<{ title: string }> = searchJson.query?.search || [];

      for (const hit of hits) {
        if (isMatchingTitle(hit.title, cleanQ)) {
          const cand = await tryTitle(hit.title);
          if (cand) {
            return cand;
          }
        }
      }
    }
  } catch {
    // Fall through
  }

  // 4. Try Opensearch if not found yet
  try {
    const openRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(
        cleanQ
      )}&limit=8&namespace=0&format=json`,
      {
        headers: { "User-Agent": WIKI_USER_AGENT },
        next: { revalidate: 3600 },
      }
    );

    if (openRes.ok) {
      const [, titles] = (await openRes.json()) as [string, string[]];
      if (Array.isArray(titles)) {
        for (const t of titles) {
          if (isMatchingTitle(t, cleanQ)) {
            const cand = await tryTitle(t);
            if (cand) {
              return cand;
            }
          }
        }
      }
    }
  } catch {
    // Fall through
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q") || "";
  const customTldsParam = searchParams.get("customTlds") || "";
  const lang = (searchParams.get("lang") || "en").toLowerCase();

  // Extract explicit TLD from the query if typed as a domain (e.g. "brand.ro", "brand.co.uk")
  const rawTldMatch = rawQuery
    .trim()
    .toLowerCase()
    .match(/\.([a-z0-9-]+\.[a-z0-9-]+|[a-z0-9-]{2,24})$/i);
  const typedTld = rawTldMatch ? rawTldMatch[1] : null;

  // Extract clean brand name
  let cleanQ = rawQuery.trim().replace(/^@+/, "");
  cleanQ = cleanQ.replace(/\.[a-z0-9-]+\.[a-z0-9-]+$/i, "");
  cleanQ = cleanQ.replace(/\.[a-z0-9-]{2,24}$/i, "");
  cleanQ = cleanQ.replace(/[^a-z0-9_-]/g, "");

  // Combine custom / requested TLDs
  const parsedCustomTlds = customTldsParam
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/^\.+/, ""))
    .filter(Boolean);

  if (typedTld && !parsedCustomTlds.includes(typedTld)) {
    parsedCustomTlds.unshift(typedTld);
  }

  if (!cleanQ) {
    return NextResponse.json<WikiSummaryResult>({
      found: false,
      source: "none",
      query: "",
      message: "No existing wikipedia page found",
    });
  }

  try {
    // Concurrently fetch Wikipedia article and discover active TLD websites
    const [wikiData, { best: bestSite, all: allSites }] = await Promise.all([
      findWikipediaArticle(cleanQ, lang),
      findAllWebsites(cleanQ, parsedCustomTlds, lang),
    ]);

    // A) If Wikipedia article was found:
    if (wikiData) {
      const title = wikiData.title || cleanQ;
      const description = wikiData.description || "Wikipedia Article";
      const extract = wikiData.extract;
      const url =
        wikiData.content_urls?.desktop?.page ||
        `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`;
      const thumbnail = wikiData.thumbnail?.source || null;
      const aiSummary = synthesizeWikiAi(title, description, extract);

      return NextResponse.json<WikiSummaryResult>({
        found: true,
        source: "wikipedia",
        query: cleanQ,
        title,
        description,
        extract,
        url,
        thumbnail,
        aiSummary,
        websiteSummary: bestSite,
        allWebsites: allSites,
      });
    }

    // B) If NO Wikipedia article available -> progressive tiered TLD crawl:
    if (bestSite) {
      return NextResponse.json<WikiSummaryResult>({
        found: true,
        source: "website",
        query: cleanQ,
        message: "No existing wikipedia page found",
        websiteSummary: bestSite,
        allWebsites: allSites,
      });
    }

    // C) Neither Wikipedia nor any TLD in all tiers found:
    return NextResponse.json<WikiSummaryResult>({
      found: false,
      source: "none",
      query: cleanQ,
      message: "No existing wikipedia page found",
    });
  } catch (error) {
    return NextResponse.json<WikiSummaryResult>({
      found: false,
      source: "none",
      query: cleanQ,
      message: "No existing wikipedia page found",
    });
  }
}
