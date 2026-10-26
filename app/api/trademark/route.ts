import { NextRequest, NextResponse } from "next/server";
import { TrademarkCheckResult, TrademarkConflictItem } from "@/lib/types";
import { extractDeepCompanyInfo } from "@/lib/companyExtractor";

export const dynamic = "force-dynamic";

function getCorporateDirectoryLabel(lang: string): string {
  if (lang === "ja") return "法人企業登記簿";
  if (lang === "ko") return "기업 등록부";
  if (lang === "zh") return "公司企业名录";
  if (lang === "ro") return "Director Corporativ";
  if (lang === "de") return "Unternehmensverzeichnis";
  if (lang === "fr") return "Annuaire des Sociétés";
  if (lang === "es") return "Directorio Corporativo";
  if (lang === "it") return "Elenco Societario";
  if (lang === "pt") return "Diretório Corporativo";
  return "Corporate Directory";
}

function getCorporateDirectoryDesc(domain: string, lang: string): string {
  if (lang === "ja") return `${domain} で運営中の商業法人。商標第35/42類のビジネス名競合の可能性があります。`;
  if (lang === "ko") return `${domain}에서 운영 중인 상업 법인. 상표 제35/42류 비즈니스 명칭 충돌 가능성이 있습니다.`;
  if (lang === "zh") return `在 ${domain} 运营的商业实体。存在第35/42类商标商业名称冲突风险。`;
  if (lang === "ro") return `Entitate comercială activă ce operează la ${domain}. Posibil conflict de nume în Clasa 35/42.`;
  if (lang === "de") return `Aktives kommerzielles Unternehmen auf ${domain}. Potenzieller Namenskonflikt in Klasse 35/42.`;
  if (lang === "fr") return `Entité commerciale active opérant sur ${domain}. Conflit potentiel en Classe 35/42.`;
  if (lang === "es") return `Entidad comercial activa que opera en ${domain}. Posible conflicto en Clase 35/42.`;
  if (lang === "it") return `Attività commerciale attiva operante su ${domain}. Possibile conflitto in Classe 35/42.`;
  if (lang === "pt") return `Entidade comercial ativa operando em ${domain}. Potencial conflito na Classe 35/42.`;
  return `Active commercial entity operating at ${domain}. Potential Class 35/42 business name conflict.`;
}

function getCommercialRegionLabel(tld: string, lang: string): string {
  const isRo = tld === "ro";
  const isUk = tld === "uk" || tld === "co.uk";
  const isDe = tld === "de";
  const isEu = tld === "eu";

  if (lang === "ja") {
    if (isRo) return "ルーマニアの商業法人";
    if (isUk) return "英国の商業法人";
    if (isDe) return "ドイツの商業法人";
    if (isEu) return "EUの商業法人";
    return "商業法人・企業";
  }
  if (lang === "ko") {
    if (isRo) return "루마니아 상업 법인";
    if (isUk) return "영국 상업 법인";
    if (isDe) return "독일 상업 법인";
    if (isEu) return "EU 상업 법인";
    return "상업 법인";
  }
  if (lang === "zh") {
    if (isRo) return "罗马尼亚商业实体";
    if (isUk) return "英国商业实体";
    if (isDe) return "德国商业实体";
    if (isEu) return "欧盟商业实体";
    return "商业实体企业";
  }
  if (lang === "ro") {
    if (isRo) return "Entitate Comercială Românească";
    if (isUk) return "Entitate Comercială Britanică";
    if (isDe) return "Entitate Comercială Germană";
    if (isEu) return "Entitate Comercială din UE";
    return "Entitate Comercială";
  }
  if (lang === "de") {
    if (isRo) return "Rumänische kommerzielle Einheit";
    if (isUk) return "Britische kommerzielle Einheit";
    if (isDe) return "Deutsche kommerzielle Einheit";
    if (isEu) return "EU-weite kommerzielle Einheit";
    return "Kommerzielle Einheit";
  }
  if (lang === "fr") {
    if (isRo) return "Entité commerciale roumaine";
    if (isUk) return "Entité commerciale britannique";
    if (isDe) return "Entité commerciale allemande";
    if (isEu) return "Entité commerciale de l'UE";
    return "Entité commerciale";
  }
  if (lang === "es") {
    if (isRo) return "Entidad comercial rumana";
    if (isUk) return "Entidad comercial británica";
    if (isDe) return "Entidad comercial alemana";
    if (isEu) return "Entidad comercial de la UE";
    return "Entidad comercial";
  }
  if (lang === "it") {
    if (isRo) return "Entità commerciale rumena";
    if (isUk) return "Entità commerciale britannica";
    if (isDe) return "Entità commerciale tedesca";
    if (isEu) return "Entità commerciale dell'UE";
    return "Entità commerciale";
  }
  if (lang === "pt") {
    if (isRo) return "Entidade comercial romena";
    if (isUk) return "Entidade comercial britânica";
    if (isDe) return "Entidade comercial alemã";
    if (isEu) return "Entidade comercial da UE";
    return "Entidade comercial";
  }
  if (isRo) return "Romanian Commercial Entity";
  if (isUk) return "UK Commercial Entity";
  if (isDe) return "German Commercial Entity";
  if (isEu) return "EU Commercial Entity";
  return "Active Commercial Entity";
}

function getActiveBusinessDesc(domain: string, lang: string): string {
  if (lang === "ja") return `${domain} で活発に運営されている商業ビジネスです。`;
  if (lang === "ko") return `${domain}에서 활발하게 운영 중인 상업 비즈니스입니다.`;
  if (lang === "zh") return `在 ${domain} 上处于活跃运营状态的商业企业。`;
  if (lang === "ro") return `Companie comercială activă ce operează pe ${domain}.`;
  if (lang === "de") return `Aktives kommerzielles Unternehmen auf ${domain}.`;
  if (lang === "fr") return `Entreprise commerciale active opérant sur ${domain}.`;
  if (lang === "es") return `Negocio comercial activo operando en ${domain}.`;
  if (lang === "it") return `Attività commerciale attiva operante su ${domain}.`;
  if (lang === "pt") return `Negócio comercial ativo operando em ${domain}.`;
  return `Active commercial business operating on ${domain}.`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rawQuery = (searchParams.get("q") || "").trim();
  const customTldsParam = searchParams.get("customTlds") || "";
  const lang = (searchParams.get("lang") || "en").toLowerCase();
  const clean = rawQuery.toLowerCase().replace(/[^a-z0-9_-]/g, "");

  if (!clean) {
    return NextResponse.json(
      { error: "Missing brand query" },
      { status: 400 }
    );
  }

  const requestedTlds = customTldsParam
    .split(",")
    .map((t) => t.trim().toLowerCase().replace(/^\.+/, ""))
    .filter(Boolean);

  const candidateTlds = Array.from(
    new Set([...requestedTlds, "ro", "com", "co.uk", "de", "eu", "org", "io", "app", "net", "co"])
  );

  const conflicts: TrademarkConflictItem[] = [];

  await Promise.allSettled([
    // 1. Clearbit Corporate Entity Lookup
    (async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(
          `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(
            clean
          )}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data.slice(0, 4)) {
            if (item.name && item.domain) {
              conflicts.push({
                source: getCorporateDirectoryLabel(lang),
                title: `${item.name} (${item.domain})`,
                description: getCorporateDirectoryDesc(item.domain, lang),
                url: `https://${item.domain}`,
                type: "Corporate Entity",
              });
            }
          }
        }
      } catch {
        // ignore
      } finally {
        clearTimeout(t);
      }
    })(),

    // 2. Apple App Store / Software Trademark Class 9/42 Lookup
    (async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(
            clean
          )}&entity=software&limit=5`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.results)) {
          const cleanNorm = clean.replace(/[^a-z0-9]/g, "");
          for (const app of data.results) {
            const trackName = String(app.trackName || "");
            const trackNorm = trackName.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (
              trackNorm === cleanNorm ||
              trackNorm.startsWith(cleanNorm)
            ) {
              conflicts.push({
                source: "App Store (Class 9/42)",
                title: `${trackName} by ${app.artistName || "Publisher"}`,
                description:
                  String(app.description || "").slice(0, 140).replace(/\s+/g, " ") + "...",
                url: app.trackViewUrl || "https://apps.apple.com",
                type: "Software / App",
              });
            }
          }
        }
      } catch {
        // ignore
      } finally {
        clearTimeout(t);
      }
    })(),

    // 3. Wikidata Global Entity & Brand Database Lookup
    (async () => {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(
          `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(
            clean
          )}&language=en&format=json&limit=4`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data?.search)) {
          for (const ent of data.search) {
            const desc = String(ent.description || "");
            if (
              /company|corporation|enterprise|software|brand|trademark|platform|service|business|organization/i.test(
                desc
              )
            ) {
              conflicts.push({
                source: "Global Brand & Entity Registry",
                title: `${ent.label} (${ent.id})`,
                description: desc,
                url: ent.concepturi || `https://www.wikidata.org/wiki/${ent.id}`,
                type: "Trademark / Brand",
              });
            }
          }
        }
      } catch {
        // ignore
      } finally {
        clearTimeout(t);
      }
    })(),

    // 4. Deep Active Commercial Domain & Corporate Intelligence Scanner
    (async () => {
      const probeCandidate = async (tld: string) => {
        const domain = `${clean}.${tld}`;
        try {
          // Fast DNS query via Cloudflare DoH
          const dnsCtrl = new AbortController();
          const dnsTimeout = setTimeout(() => dnsCtrl.abort(), 2000);
          const dnsRes = await fetch(
            `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=NS`,
            {
              headers: { Accept: "application/dns-json" },
              signal: dnsCtrl.signal,
            }
          )
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null);
          clearTimeout(dnsTimeout);

          if (!dnsRes || dnsRes.Status !== 0 || !Array.isArray(dnsRes.Answer) || dnsRes.Answer.length === 0) {
            return;
          }

          // Fetch HTTP/HTTPS to extract deep company metadata
          const httpCtrl = new AbortController();
          const httpTimeout = setTimeout(() => httpCtrl.abort(), 2800);

          const tryFetch = async (protocol: "https" | "http") => {
            try {
              const res = await fetch(`${protocol}://${domain}`, {
                signal: httpCtrl.signal,
                redirect: "follow",
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                },
              });
              if (!res.ok && res.status !== 404 && res.status !== 403) return null;
              const text = await res.text();
              return { url: res.url, html: text, status: res.status };
            } catch {
              return null;
            }
          };

          let siteData = await tryFetch("https");
          if (!siteData) siteData = await tryFetch("http");
          clearTimeout(httpTimeout);

          if (!siteData || !siteData.html) return;

          const companyInfo = extractDeepCompanyInfo(siteData.html, domain);
          const titleMatch = siteData.html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].replace(/\s+/g, " ").trim() : "";
          const descMatch = siteData.html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const desc = descMatch ? descMatch[1].replace(/\s+/g, " ").trim() : "";

          // Check if parked
          const lowerHtml = siteData.html.toLowerCase();
          const isParked =
            lowerHtml.includes("sedoparking") ||
            lowerHtml.includes("buy this domain") ||
            lowerHtml.includes("domain is for sale") ||
            lowerHtml.includes("dan.com");

          if (isParked) return;

          // If company info or meaningful title/desc found
          if (companyInfo || (title && title.length > 3)) {
            const companyDisplayName =
              companyInfo?.legalName ||
              companyInfo?.brandName ||
              (title ? title.split(/[|–-]/)[0].trim() : domain);

            const detailsSummaryParts: string[] = [];
            if (companyInfo?.legalName) {
              const legalPrefix = lang === "ja" ? "法人名:" : lang === "ko" ? "법인명:" : lang === "zh" ? "法定名称:" : lang === "ro" ? "Nume legal:" : lang === "de" ? "Rechtlicher Name:" : lang === "fr" ? "Nom légal :" : lang === "es" ? "Nombre legal:" : lang === "it" ? "Nome legale:" : lang === "pt" ? "Nome legal:" : "Legal Entity:";
              detailsSummaryParts.push(`${legalPrefix} ${companyInfo.legalName}`);
            }
            if (companyInfo?.foundingDate) {
              const foundPrefix = lang === "ja" ? "設立:" : lang === "ko" ? "설립:" : lang === "zh" ? "成立时间:" : lang === "ro" ? "Înființată:" : lang === "de" ? "Gegründet:" : lang === "fr" ? "Fondée en :" : lang === "es" ? "Fundada en:" : lang === "it" ? "Fondata nel:" : lang === "pt" ? "Fundada em:" : "Founded:";
              detailsSummaryParts.push(`${foundPrefix} ${companyInfo.foundingDate}`);
            }
            if (companyInfo?.vatID || companyInfo?.taxID) {
              detailsSummaryParts.push(`Tax/VAT: ${companyInfo.vatID || companyInfo.taxID}`);
            }
            if (companyInfo?.address) {
              const hqPrefix = lang === "ja" ? "所在地:" : lang === "ko" ? "본사:" : lang === "zh" ? "总部:" : lang === "ro" ? "Sediu:" : lang === "de" ? "Sitz:" : lang === "fr" ? "Siège :" : lang === "es" ? "Sede:" : lang === "it" ? "Sede:" : lang === "pt" ? "Sede:" : "HQ:";
              detailsSummaryParts.push(`${hqPrefix} ${companyInfo.address}`);
            }
            if (desc) detailsSummaryParts.push(desc);

            const regionLabel = getCommercialRegionLabel(tld, lang);

            conflicts.push({
              source: regionLabel,
              title: `${companyDisplayName} (${domain})`,
              description: detailsSummaryParts.join(" • ") || getActiveBusinessDesc(domain, lang),
              url: `https://${domain}`,
              type: "Corporate Entity",
              companyInfo: companyInfo || undefined,
            });
          }
        } catch {
          // ignore individual candidate errors
        }
      };

      await Promise.all(candidateTlds.map((tld) => probeCandidate(tld)));
    })(),
  ]);

  // Deduplicate conflicts by title
  const uniqueConflicts = conflicts.filter(
    (item, idx, arr) =>
      arr.findIndex((x) => x.title.toLowerCase() === item.title.toLowerCase()) === idx
  );

  const exactCorporateMatch = uniqueConflicts.some((c) => {
    const titleFirst = c.title.split("(")[0].trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    return titleFirst === clean.replace(/[^a-z0-9]/g, "");
  });

  const activeCompanyConflict = uniqueConflicts.find(
    (c) => c.source.includes("Commercial Entity") || c.companyInfo?.legalName
  );

  let riskLevel: "High" | "Medium" | "Low" = "Low";
  let riskSummary = "";

  if (activeCompanyConflict) {
    riskLevel = "High";
    const compName =
      activeCompanyConflict.companyInfo?.legalName ||
      activeCompanyConflict.companyInfo?.brandName ||
      activeCompanyConflict.title.split("(")[0].trim();
    const domain = activeCompanyConflict.url.replace(/^https?:\/\//, "").replace(/\/$/, "");

    if (lang === "ro") {
      riskSummary = `Risc ridicat de coliziune: Compania comercială activă „${compName}” operează pe ${domain}. O firmă stabilită desfășoară deja activități comerciale sub această identitate de brand.`;
    } else if (lang === "de") {
      riskSummary = `Hohes Kollisionsrisiko: Aktives kommerzielles Unternehmen „${compName}“ ist auf ${domain} tätig. Ein etabliertes Unternehmen handelt bereits unter dieser Markenidentität.`;
    } else if (lang === "fr") {
      riskSummary = `Risque élevé de collision : L'entreprise commerciale active « ${compName} » opère sur ${domain}. Une entreprise établie exerce déjà ses activités sous cette identité de marque.`;
    } else if (lang === "es") {
      riskSummary = `Alto riesgo de colisión: La empresa comercial activa "${compName}" está operando en ${domain}. Una compañía establecida ya comercia bajo esta identidad de marca.`;
    } else if (lang === "it") {
      riskSummary = `Alto rischio di collisione: L'attività commerciale attiva "${compName}" opera su ${domain}. Un'azienda consolidata commercia già con questa identità di marchio.`;
    } else if (lang === "pt") {
      riskSummary = `Alto risco de colisão: A empresa comercial ativa "${compName}" opera em ${domain}. Uma empresa estabelecida já comercializa sob esta identidade de marca.`;
    } else if (lang === "ja") {
      riskSummary = `商標および商用競合リスク（高）: 商業企業「${compName}」が現在 ${domain} で活発に運営されています。すでに確立された企業がこのブランド名で取引を行っています。`;
    } else if (lang === "zh") {
      riskSummary = `商业与商标冲突风险（高）：已有在营商业实体“${compName}”在 ${domain} 上开展运营，已有知名企业在该品牌名称下开展贸易。`;
    } else if (lang === "ko") {
      riskSummary = `상표 및 상업적 충돌 위험 (높음): 활성 상업 기업 "${compName}"이(가) ${domain}에서 활발히 운영 중입니다. 기존 기업이 이미 이 브랜드 아이덴티티로 영업하고 있습니다.`;
    } else {
      riskSummary = `High collision risk: Active commercial business "${compName}" is actively operating on ${domain}. An established company is already trading under this brand identity.`;
    }
  } else if (exactCorporateMatch || uniqueConflicts.length >= 3) {
    riskLevel = "High";
    if (lang === "ro") {
      riskSummary = `Risc ridicat de coliziune: Entități comerciale active sau produse software publicate operează deja sub numele „${rawQuery}”. Utilizarea acestui nume în aceeași clasă industrială poate atrage opoziții de marcă.`;
    } else if (lang === "de") {
      riskSummary = `Hohes Kollisionsrisiko: Aktive kommerzielle Einheiten oder Softwareprodukte operieren bereits unter „${rawQuery}“. Bei Verwendung in derselben Markenklasse kann Markenwiderspruch drohen.`;
    } else if (lang === "fr") {
      riskSummary = `Risque élevé de collision : Des entités commerciales ou logiciels publiés opèrent déjà sous « ${rawQuery} ». L'utilisation de ce nom dans la même classe peut faire l'objet d'une opposition de marque.`;
    } else if (lang === "es") {
      riskSummary = `Alto riesgo de colisión: Entidades comerciales activas o productos de software ya operan bajo "${rawQuery}". El uso de este nombre en la misma clase puede enfrentar oposición de marca.`;
    } else if (lang === "it") {
      riskSummary = `Alto rischio di collisione: Entità commerciali attive o software pubblicati operano già sotto "${rawQuery}". L'uso in classi simili può subire opposizioni legali.`;
    } else if (lang === "pt") {
      riskSummary = `Alto risco de colisão: Entidades comerciais ativas ou softwares operam sob "${rawQuery}". O uso nesta mesma classe de marca pode sofrer oposição.`;
    } else if (lang === "ja") {
      riskSummary = `商標競合リスク（高）: 商業法人または公開ソフトウェアが既に「${rawQuery}」の名称で存在します。同一分類（第9/42類）での利用は商標異議申立てを受ける可能性があります。`
    } else if (lang === "zh") {
      riskSummary = `商业与商标冲突风险（高）：已有商业实体或软件产品在“${rawQuery}”名称下运营。在同类行业分类（如第9/42类）中使用可能会面临商标异议。`;
    } else if (lang === "ko") {
      riskSummary = `상표 및 상업적 충돌 위험 (높음): 활성 기업 또는 출시된 소프트웨어가 이미 "${rawQuery}" 이름으로 존재합니다. 동일한 니스 분류에서 사용 시 상표 이의신청에 직면할 수 있습니다.`;
    } else {
      riskSummary = `High collision risk: Active commercial entities or published software products already operate under "${rawQuery}". Using this name in the same industry class (e.g. Class 9/42 Tech) may face trademark opposition.`;
    }
  } else if (uniqueConflicts.length > 0) {
    riskLevel = "Medium";
    const count = uniqueConflicts.length;
    if (lang === "ro") {
      riskSummary = `Risc moderat de coliziune: S-au găsit ${count} potriviri de entități comerciale sau software pentru „${rawQuery}”. Verificați clasificarea Nisa la USPTO/EUIPO.`;
    } else if (lang === "de") {
      riskSummary = `Moderates Kollisionsrisiko: ${count} Treffer für kommerzielle oder Software-Einheiten zu „${rawQuery}“ gefunden. Nizza-Klassifikation im Markenamt prüfen.`;
    } else if (lang === "fr") {
      riskSummary = `Risque modéré de collision : ${count} entités commerciales ou logiciels trouvés pour « ${rawQuery} ». Vérifiez la classe de Nice auprès de l'EUIPO/USPTO.`;
    } else if (lang === "es") {
      riskSummary = `Riesgo moderado de colisión: Se encontraron ${count} coincidencias comerciales o de software para "${rawQuery}". Verifique la clasificación de Niza.`;
    } else if (lang === "it") {
      riskSummary = `Rischio moderato di collisione: Trovate ${count} corrispondenze aziendali o software per "${rawQuery}". Verifica la classificazione di Nizza.`;
    } else if (lang === "pt") {
      riskSummary = `Risco moderado de colisão: Encontradas ${count} correspondências para "${rawQuery}". Verifique a classe de Nice no órgão competente.`;
    } else if (lang === "ja") {
      riskSummary = `商標競合リスク（中）: 「${rawQuery}」に関連する商用またはソフトウェアの一致が ${count} 件見つかりました。特許庁・商標庁でニース分類を確認してください。`;
    } else if (lang === "zh") {
      riskSummary = `商业与商标冲突风险（中）：发现 ${count} 个与“${rawQuery}”相关的商业或软件匹配项。请核查商标分类以避免领域重叠。`;
    } else if (lang === "ko") {
      riskSummary = `상표 및 상업적 충돌 위험 (보통): "${rawQuery}"에 대한 관련 상업 또는 소프트웨어 항목이 ${count}건 발견되었습니다. 특허청에서 니스 분류를 확인하세요.`;
    } else {
      riskSummary = `Moderate collision risk: Found ${count} related commercial or software entity match(es) for "${rawQuery}". Check the nice classification (Nice Class) in USPTO/EUIPO to ensure your industry doesn't overlap.`;
    }
  } else {
    if (lang === "ro") {
      riskSummary = `Nu au fost detectate coliziuni comerciale directe pentru „${rawQuery}”. Recomandăm totuși verificarea oficială la OSIM/EUIPO înainte de înființarea firmei.`;
    } else if (lang === "de") {
      riskSummary = `Keine direkten Marken- oder Softwarekollisionen für „${rawQuery}“ gefunden. Vor der Unternehmensgründung dennoch im Register prüfen.`;
    } else if (lang === "fr") {
      riskSummary = `Aucune collision directe détectée pour « ${rawQuery} ». Vérifiez tout de même auprès de l'INPI/EUIPO avant l'immatriculation.`;
    } else if (lang === "es") {
      riskSummary = `No se detectaron colisiones directas para "${rawQuery}". Verifique de todos modos antes de registrar legalmente su empresa.`;
    } else if (lang === "it") {
      riskSummary = `Nessuna collisione diretta rilevata per "${rawQuery}". Si consiglia comunque una verifica nei registri ufficiali prima della costituzione.`;
    } else if (lang === "pt") {
      riskSummary = `Nenhuma colisão direta detectada para "${rawQuery}". Ainda assim, verifique nos registros oficiais antes de registrar a empresa.`;
    } else if (lang === "ja") {
      riskSummary = `「${rawQuery}」に関する直接的な商用・商標競合は検出されませんでした。法人設立や商標出願の前に公式機関で最終確認を行ってください。`;
    } else if (lang === "zh") {
      riskSummary = `未发现关于“${rawQuery}”的直接商业或商标冲突。在递交注册前仍建议在官方注册局进行核验。`;
    } else if (lang === "ko") {
      riskSummary = `"${rawQuery}"에 대한 직접적인 상업 또는 상표 충돌이 감지되지 않았습니다. 법인 설립 전 공식 등록부에서 최종 확인하세요.`;
    } else {
      riskSummary = `No exact commercial or software brand collisions were detected for "${rawQuery}". Still verify in your target jurisdiction (USPTO / EUIPO) before filing incorporation paperwork.`;
    }
  }

  const officialDirectories = [
    {
      id: "uspto",
      name: "USPTO (United States)",
      region: "🇺🇸 US Federal Trademark",
      url: `https://tmsearch.uspto.gov/search/search-information`,
      description: `Official US Patent & Trademark Office search for "${rawQuery}"`,
    },
    {
      id: "euipo",
      name: "EUIPO eSearch Plus",
      region: "🇪🇺 European Union",
      url: `https://euipo.europa.eu/eSearch/#basic/1+1+1+1/100+100+100+100/${encodeURIComponent(
        rawQuery
      )}`,
      description: `Direct EU-wide trademark lookup for "${rawQuery}"`,
    },
    {
      id: "wipo",
      name: "WIPO Global Brand DB",
      region: "🌐 International (Madrid)",
      url: `https://branddb.wipo.int/en/quicksearch?by=brandName&v=${encodeURIComponent(
        rawQuery
      )}`,
      description: `World Intellectual Property Organization global database`,
    },
    {
      id: "ukipo",
      name: "UK IPO Trademark Search",
      region: "🇬🇧 United Kingdom",
      url: `https://trademarks.ipo.gov.uk/ipo-tmtext`,
      description: `UK Intellectual Property Office registered marks`,
    },
    {
      id: "opencorporates",
      name: "OpenCorporates Registry",
      region: "🏢 Global Companies",
      url: `https://opencorporates.com/companies?q=${encodeURIComponent(rawQuery)}`,
      description: `Search 200M+ registered legal corporations worldwide`,
    },
  ];

  const response: TrademarkCheckResult = {
    query: rawQuery,
    riskLevel,
    riskSummary,
    conflicts: uniqueConflicts.slice(0, 8),
    officialDirectories,
  };

  return NextResponse.json(response);
}
