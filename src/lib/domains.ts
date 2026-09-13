/**
 * The 14 life domains from book-message-expert. Ids match the palettes and motifs
 * in `book_card_svg.py` and must never be renamed (they are stored in the DB).
 */
export const DOMAIN_IDS = [
  "personal",
  "psychology",
  "business",
  "money",
  "productivity",
  "relationships",
  "parenting",
  "health",
  "spirituality",
  "philosophy",
  "history",
  "science",
  "biography",
  "fiction",
] as const;

export type DomainId = (typeof DOMAIN_IDS)[number];

export const DOMAIN_LABELS: Record<DomainId, string> = {
  personal: "התפתחות אישית",
  psychology: "פסיכולוגיה",
  business: "עסקים",
  money: "כסף",
  productivity: "פרודוקטיביות",
  relationships: "זוגיות",
  parenting: "הורות",
  health: "בריאות",
  spirituality: "רוחניות",
  philosophy: "פילוסופיה",
  history: "היסטוריה",
  science: "מדע",
  biography: "ביוגרפיה",
  fiction: "ספרות יפה",
};

/** Domains where a "מצב הידע היום" line is expected in generated episodes. */
export const KNOWLEDGE_TODAY_DOMAINS: ReadonlySet<DomainId> = new Set([
  "health",
  "money",
  "science",
]);

export function isDomainId(value: unknown): value is DomainId {
  return typeof value === "string" && (DOMAIN_IDS as readonly string[]).includes(value);
}
