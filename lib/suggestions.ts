export type SuggestionCategory = "popular" | "tech" | "company" | "studio" | "action";

export const SUGGESTION_CATEGORIES: { id: SuggestionCategory; label: string; description: string }[] = [
  { id: "popular", label: "Popular Mix", description: "Top YC & startup modifiers" },
  { id: "tech", label: "Tech, AI & Cloud", description: "SaaS, AI, dev & data modifiers" },
  { id: "company", label: "Corporate & Group", description: "Enterprise, holdings & global" },
  { id: "studio", label: "Agency & Studio", description: "Creative, design, media & labs" },
  { id: "action", label: "Consumer & Action", description: "Verb prefixes for apps & products" },
];

/**
 * Generates categorized alternate brand/handle suggestions when the primary name is taken.
 */
export function generateSuggestionsByCategory(
  name: string,
  category: SuggestionCategory = "popular"
): string[] {
  if (!name) return [];
  const clean = name.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!clean) return [];

  const byCategory: Record<SuggestionCategory, string[]> = {
    popular: [
      `get${clean}`,
      `try${clean}`,
      `use${clean}`,
      `${clean}hq`,
      `${clean}labs`,
      `${clean}ai`,
      `${clean}app`,
      `join${clean}`,
      `${clean}cloud`,
      `hey${clean}`,
      `go${clean}`,
      `${clean}dev`,
    ],
    tech: [
      `${clean}ai`,
      `${clean}cloud`,
      `${clean}dev`,
      `${clean}labs`,
      `${clean}tech`,
      `${clean}data`,
      `${clean}io`,
      `open${clean}`,
      `${clean}os`,
      `${clean}sys`,
      `${clean}net`,
      `${clean}stack`,
    ],
    company: [
      `${clean}hq`,
      `${clean}group`,
      `${clean}global`,
      `${clean}corp`,
      `${clean}co`,
      `${clean}inc`,
      `${clean}ventures`,
      `${clean}partners`,
      `${clean}capital`,
      `${clean}pro`,
      `${clean}solutions`,
      `${clean}team`,
    ],
    studio: [
      `${clean}studio`,
      `${clean}works`,
      `${clean}design`,
      `${clean}media`,
      `${clean}creative`,
      `${clean}digital`,
      `${clean}agency`,
      `${clean}collective`,
      `${clean}house`,
      `${clean}craft`,
      `studio${clean}`,
      `weare${clean}`,
    ],
    action: [
      `get${clean}`,
      `try${clean}`,
      `use${clean}`,
      `join${clean}`,
      `hey${clean}`,
      `go${clean}`,
      `my${clean}`,
      `with${clean}`,
      `meet${clean}`,
      `hello${clean}`,
      `run${clean}`,
      `ask${clean}`,
    ],
  };

  return Array.from(new Set(byCategory[category] || byCategory.popular));
}

/**
 * Generates smart alternate brand/handle suggestions when the primary name is taken.
 */
export function generateSuggestions(name: string): string[] {
  return generateSuggestionsByCategory(name, "popular");
}

export interface LinguisticReport {
  length: number;
  lengthVerdict: "Ideal (4–8 chars)" | "Short & Rare (1–3 chars)" | "Moderate (9–12 chars)" | "Long (13+ chars)";
  syllables: number;
  radioTestPassed: boolean;
  radioReason: string;
  pronounceability: "High" | "Moderate" | "Challenging";
  globalCheck: string;
}

/**
 * Evaluates a brand name for linguistic quality, phonetic "Radio Test", syllable count, and memorability.
 */
export function analyzeBrandLinguistics(rawName: string): LinguisticReport {
  const clean = rawName.trim().toLowerCase().replace(/\.[a-z.]+$/, "");
  // Ignore hyphens and underscores in phonetic/length checks, and split into word segments
  const withoutSeparators = clean.replace(/[-_\s]+/g, "");
  const wordSegments = clean
    .split(/[-_\s]+/)
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter(Boolean);
  const alphaOnly = withoutSeparators.replace(/[^a-z]/g, "");
  const length = withoutSeparators.length;

  let lengthVerdict: LinguisticReport["lengthVerdict"] = "Ideal (4–8 chars)";
  if (length <= 3) lengthVerdict = "Short & Rare (1–3 chars)";
  else if (length <= 8) lengthVerdict = "Ideal (4–8 chars)";
  else if (length <= 12) lengthVerdict = "Moderate (9–12 chars)";
  else lengthVerdict = "Long (13+ chars)";

  // Estimate syllables per word segment using vowel groups
  const syllables = Math.max(
    1,
    wordSegments.reduce((sum, seg) => {
      const groups = seg.replace(/e$/, "").match(/[aeiouy]{1,2}/g);
      return sum + Math.max(1, groups ? groups.length : 1);
    }, 0)
  );

  // Radio Test (ignoring hyphens/underscores and checking each word segment)
  const issues: string[] = [];
  if (/[0-9]/.test(withoutSeparators)) {
    issues.push("Contains numbers (causes '4 vs four' confusion aloud)");
  }
  if (wordSegments.some((seg) => /(.)\1\1/.test(seg))) {
    issues.push("Triple repeated letters");
  }
  if (wordSegments.some((seg) => /ph|gh|kn|wr|ps|rh|mn/.test(seg))) {
    issues.push("Silent or ambiguous phonetic digraph (e.g. ph/f, kn/n)");
  }
  if (wordSegments.some((seg) => /[bcdfghjklmnpqrstvwxz]{4,}/.test(seg))) {
    issues.push("Heavy 4+ consonant cluster");
  }
  if (wordSegments.some((seg) => seg.length > 14)) {
    issues.push("Lengthy word to spell over the phone");
  }

  const radioTestPassed = issues.length === 0;
  const radioReason = radioTestPassed
    ? "Passes Radio Test (intuitive phonetic spelling)"
    : issues[0];

  // Pronounceability
  const vowels = (alphaOnly.match(/[aeiouy]/g) || []).length;
  const ratio = alphaOnly.length > 0 ? vowels / alphaOnly.length : 0;
  let pronounceability: LinguisticReport["pronounceability"] = "High";
  if (wordSegments.some((seg) => /[bcdfghjklmnpqrstvwxz]{4,}/.test(seg)) || ratio < 0.2) {
    pronounceability = "Challenging";
  } else if (ratio < 0.3 || syllables >= 4) {
    pronounceability = "Moderate";
  }

  // Global / International negative root check
  let globalCheck = "Clean across EN / EU languages";
  if (/^(mal|mort|necro)/.test(alphaOnly)) {
    globalCheck = "Note: 'mal/mort' prefix carries negative connotation in Romance languages";
  } else if (alphaOnly === "mist") {
    globalCheck = "Note: Means 'manure/rubbish' in German";
  } else if (alphaOnly.includes("kaka") || alphaOnly.includes("caca")) {
    globalCheck = "Note: Juvenile slang in multiple languages";
  }

  return {
    length,
    lengthVerdict,
    syllables,
    radioTestPassed,
    radioReason,
    pronounceability,
    globalCheck,
  };
}
