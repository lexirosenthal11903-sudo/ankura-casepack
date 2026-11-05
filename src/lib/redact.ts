/**
 * Redaction before any AI call. Three layers, run in order:
 *
 * 1. Record dictionary. The bank's case system already knows the customer, the other parties, the staff
 *    and the account numbers, so we search the free text for every variant of those (full name, title + surname,
 *    initial + surname, surname alone, first name, common nicknames, usernames, initials, spaced numbers).
 * 2. Patterns. Emails, UK phone numbers, postcodes, sort codes, account and card numbers, street addresses,
 *    staff sign-offs, for identifiers that are NOT in the record (an executor's email, a son's mobile).
 * 3. Near matches. A title followed by a name ("Mr Hussian") or a capitalised word one or two letters away from
 *    a known name is treated as that person, because call notes misspell names.
 *
 * Dates and amounts are kept, because deadlines and the case facts need them.
 * Placeholders are role-typed ([CUSTOMER], [EXECUTOR], [STAFF_1]) so the AI can still follow who did what.
 *
 * This is not perfect and is never described as perfect. evals/redaction measures how many planted
 * identifiers it catches, and the result is reported as a percentage.
 */
import type { CaseFile, CaseRecord, PartyRole } from "./types";

export type Layer = "record" | "pattern" | "near_match";

export interface Replacement {
  placeholder: string;
  original: string;
  layer: Layer;
  documentId: string;
}

export interface RedactedDocument {
  id: string;
  system: string;
  type: string;
  date: string;
  author_role: string;
  text: string;
}

export interface RedactedCase {
  id: string;
  received: string;
  channel: string;
  documents: RedactedDocument[];
  replacements: Replacement[];
  placeholders: string[];
}

interface Entity {
  placeholder: string;
  isCustomer: boolean;
  /** Strings to look for. Matched as whole words, ignoring case and accents. */
  variants: string[];
  /** Strings matched exactly as written (short initials like "PR", where ignoring case would hit ordinary words). */
  exactVariants: string[];
  /** Names used by the near-match layer. */
  names: string[];
}

const NICKNAMES: Record<string, string[]> = {
  agnieszka: ["Aga", "Agnes"], alexander: ["Alex", "Sandy"], alexandra: ["Alex", "Lexi", "Sandra"],
  andrew: ["Andy", "Drew"], anthony: ["Tony"], benjamin: ["Ben"], catherine: ["Cath", "Kate", "Cathy"],
  charles: ["Charlie"], christopher: ["Chris"], daniel: ["Dan", "Danny"], david: ["Dave"], deborah: ["Debbie", "Deb"],
  edward: ["Ed", "Eddie", "Ted"], elizabeth: ["Liz", "Beth", "Lizzie", "Betty"], francesca: ["Fran", "Frankie"],
  frances: ["Fran"], gregory: ["Greg"], jacqueline: ["Jackie"], james: ["Jim", "Jimmy", "Jamie"], jennifer: ["Jen", "Jenny"],
  jonathan: ["Jon"], joseph: ["Joe"], katherine: ["Kate", "Kath", "Katie"], kenneth: ["Ken"], margaret: ["Maggie", "Peggy", "Meg", "Marg"],
  matthew: ["Matt"], michael: ["Mike", "Mick"], nicholas: ["Nick"], patricia: ["Pat", "Trish", "Patsy"], patrick: ["Pat", "Paddy"],
  peter: ["Pete"], rebecca: ["Bex", "Becky", "Becca"], richard: ["Rich", "Rick", "Dick"], robert: ["Rob", "Bob", "Bobby"],
  samantha: ["Sam"], samuel: ["Sam"], stephen: ["Steve"], steven: ["Steve"], susan: ["Sue"], tariq: ["Taz"], thomas: ["Tom", "Tommy"],
  timothy: ["Tim"], victoria: ["Vicky", "Tori"], william: ["Will", "Bill", "Billy"], zachary: ["Zac", "Zach"],
};

const TITLES = ["Mr", "Mrs", "Ms", "Miss", "Mx", "Dr"];

// Letters that often carry accents, so "Wojcik" in a system log matches "Wójcik" in an email.
const ACCENTS: Record<string, string> = {
  a: "aàáâäãåą", c: "cçćč", e: "eèéêëę", i: "iìíîï", l: "lł", n: "nñń", o: "oòóôöõø", s: "sśšş", u: "uùúûü", y: "yýÿ", z: "zźżž",
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Regex source for a variant: accent-tolerant letters, flexible spacing and punctuation between words. */
function variantPattern(variant: string): string {
  return fold(variant)
    .split("")
    .map((ch) => {
      if (ACCENTS[ch]) return `[${ACCENTS[ch]}]`;
      if (/\s/.test(ch)) return "[\\s.]*\\s?";
      return escapeRegex(ch);
    })
    .join("");
}

const WORD_BEFORE = "(?<![\\p{L}\\p{N}])";
const WORD_AFTER = "(?![\\p{L}\\p{N}])";

function splitName(name: string): { first: string; last: string } {
  const parts = name.trim().split(/\s+/);
  return { first: parts[0], last: parts.length > 1 ? parts[parts.length - 1] : "" };
}

function personVariants(name: string, title: string | undefined, isStaff: boolean) {
  const { first, last } = splitName(name);
  const variants = new Set<string>([name]);
  const exact = new Set<string>();
  if (last) {
    variants.add(last);
    variants.add(`${first[0]} ${last}`);
    variants.add(`${last} ${first[0]}`);
    variants.add(`${first[0]}${last}`); // system usernames such as TBRIGHT
    for (const t of TITLES) variants.add(`${t} ${last}`);
    if (title) variants.add(`${title} ${first[0]} ${last}`);
    exact.add(`${first[0]}${last[0]}`.toUpperCase()); // initials such as "PR" in a sign-off
  }
  variants.add(first);
  for (const nick of NICKNAMES[fold(first)] ?? []) variants.add(nick);
  if (!isStaff && last && title) variants.add(`${title} ${last[0]}`); // "Mrs H"
  return { variants: [...variants].filter((v) => v.length >= 2), exact: [...exact], names: [first, last].filter(Boolean) };
}

function digitsPattern(digits: string): string {
  return digits.split("").join("[\\s-]?");
}

function buildEntities(record: CaseRecord): Entity[] {
  const entities: Entity[] = [];
  const roleCounts: Record<string, number> = {};
  const parties = record.other_parties.filter((p) => p.name);
  for (const p of parties) roleCounts[p.role] = (roleCounts[p.role] ?? 0) + 1;
  const roleSeen: Record<string, number> = {};
  const rolePlaceholder = (role: PartyRole | "STAFF") => {
    roleSeen[role] = (roleSeen[role] ?? 0) + 1;
    const total = role === "STAFF" ? record.staff.length : roleCounts[role];
    return total > 1 ? `[${role}_${roleSeen[role]}]` : `[${role}]`;
  };

  // Other named parties first, so "Helen Achterberg-Moss" is matched before the shorter "Achterberg".
  const customerIsDeceased = parties.some((p) => p.role === "DECEASED" && p.name === record.customer.name);
  for (const p of parties) {
    if (p.role === "DECEASED" && p.name === record.customer.name) continue;
    const v = personVariants(p.name!, undefined, false);
    entities.push({ placeholder: rolePlaceholder(p.role), isCustomer: false, variants: v.variants, exactVariants: v.exact, names: v.names });
  }
  const c = record.customer;
  const cv = personVariants(c.name, c.title, false);
  const customerVariants = [...cv.variants];
  if (c.email) customerVariants.push(c.email);
  if (c.address) customerVariants.push(c.address, c.address.split(",")[0]);
  if (c.postcode) customerVariants.push(c.postcode);
  entities.push({ placeholder: customerIsDeceased ? "[DECEASED]" : "[CUSTOMER]", isCustomer: true, variants: customerVariants, exactVariants: cv.exact, names: cv.names });

  for (const s of record.staff) {
    const v = personVariants(s.name, undefined, true);
    entities.push({ placeholder: rolePlaceholder("STAFF"), isCustomer: false, variants: v.variants, exactVariants: v.exact, names: v.names });
  }
  return entities;
}

interface NumberEntity {
  placeholder: string;
  pattern: string;
}

function buildNumberEntities(record: CaseRecord): NumberEntity[] {
  const out: NumberEntity[] = [];
  record.accounts.forEach((a, i) => {
    const tag = record.accounts.length > 1 ? `[ACCOUNT_${i + 1}]` : "[ACCOUNT]";
    if (a.number) {
      out.push({ placeholder: tag, pattern: digitsPattern(a.number) });
      out.push({ placeholder: tag, pattern: digitsPattern(a.number.slice(-4)) });
    }
    if (a.card_last4) out.push({ placeholder: "[CARD]", pattern: digitsPattern(a.card_last4) });
    if (a.sort_code) out.push({ placeholder: "[SORT_CODE]", pattern: digitsPattern(a.sort_code.replace(/\D/g, "")) });
  });
  if (record.customer.phone) {
    out.push({ placeholder: "[CUSTOMER_PHONE]", pattern: digitsPattern(record.customer.phone.replace(/\D/g, "")) });
  }
  return out;
}

interface Match {
  start: number;
  end: number;
  placeholder: string;
  layer: Layer;
}

/** Keeps the longest match where matches overlap, then rebuilds the text. */
function applyMatches(text: string, matches: Match[]): { text: string; applied: Match[] } {
  const sorted = [...matches].sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: Match[] = [];
  for (const m of sorted) {
    const last = kept[kept.length - 1];
    if (last && m.start < last.end) {
      if (m.end - m.start > last.end - last.start) kept[kept.length - 1] = m;
      continue;
    }
    kept.push(m);
  }
  let out = "";
  let cursor = 0;
  for (const m of kept) {
    out += text.slice(cursor, m.start) + m.placeholder;
    cursor = m.end;
  }
  return { text: out + text.slice(cursor), applied: kept };
}

function findAll(text: string, source: string, flags: string, placeholder: string, layer: Layer, group = 0): Match[] {
  const re = new RegExp(source, flags.includes("g") ? flags : flags + "g");
  const found: Match[] = [];
  for (const m of text.matchAll(re)) {
    if (m.index === undefined) continue;
    const value = m[group];
    if (value === undefined) continue;
    const start = m.index + m[0].indexOf(value);
    found.push({ start, end: start + value.length, placeholder, layer });
  }
  return found;
}

// Layer 2 patterns. Each value found gets a numbered placeholder, and the same value always gets the same one.
const PATTERNS: { kind: string; source: string; flags: string; group?: number }[] = [
  { kind: "PHONE", source: `${WORD_BEFORE}(?:\\+44\\s?|0)(?:\\d[\\s-]?){9,10}${WORD_AFTER}`, flags: "gu" },
  { kind: "POSTCODE", source: `${WORD_BEFORE}[A-Z]{1,2}\\d[A-Z\\d]?\\s?\\d[A-Z]{2}${WORD_AFTER}`, flags: "gu" },
  { kind: "SORT_CODE", source: `${WORD_BEFORE}\\d{2}-\\d{2}-\\d{2}${WORD_AFTER}`, flags: "gu" },
  { kind: "CARD_NUMBER", source: `${WORD_BEFORE}(?:\\d{4}[\\s-]?){3}\\d{4}${WORD_AFTER}`, flags: "gu" },
  // Not joined by a hyphen, so reference numbers such as INC-2026-1030-01 are left alone.
  { kind: "ACCOUNT_NUMBER", source: "(?<![\\p{L}\\d-])\\d{4}\\s?\\d{4}(?![\\p{L}\\d-])", flags: "gu" },
  { kind: "CARD_DIGITS", source: "(?:ending(?: in)?|ends in|last (?:4|four)(?: digits)?(?: of [\\w ]{1,20}?)?|card|acc(?:oun)?t)[:\\s]+(?:no\\.?\\s*)?(\\d{4})(?!\\d)", flags: "giu", group: 1 },
  { kind: "ADDRESS", source: `${WORD_BEFORE}(?:Flat \\d+[A-Za-z]?,?\\s+)?\\d{1,4}[A-Za-z]?\\s+(?:[A-Z][a-z]+\\s){1,3}(?:Road|Rd|Street|St|Lane|Ln|Avenue|Ave|Close|Drive|Dr|Way|Court|Ct|Place|Crescent|Gardens|Terrace|Grove|Mews|Row|Walk|Square|Hill|Park)\\b`, flags: "gu" },
  { kind: "STAFF", source: "(?:^|\\s)[-–]\\s?([A-Z]{2,3})\\.?\\s*$", flags: "gmu", group: 1 },
  { kind: "STAFF", source: "\\b(?:user|by|agent|handler)[:\\s]+([A-Z]{5,})\\b", flags: "gu", group: 1 },
];

const EMAIL_PATTERN: (typeof PATTERNS)[number] = { kind: "EMAIL", source: "[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+", flags: "giu" };

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function closestEntity(word: string, entities: Entity[], maxDistance: number): Entity | undefined {
  const w = fold(word);
  let best: { e: Entity; d: number } | undefined;
  for (const e of entities) {
    for (const n of e.names) {
      if (n.length < 4) continue;
      const d = levenshtein(w, fold(n));
      if (d <= maxDistance && (!best || d < best.d)) best = { e, d };
    }
  }
  return best?.e;
}

export function redactCase(c: CaseFile): RedactedCase {
  const entities = buildEntities(c.record);
  const numbers = buildNumberEntities(c.record);
  const replacements: Replacement[] = [];
  const patternValues = new Map<string, string>();
  const patternCounts: Record<string, number> = {};

  // Where a surname is shared (a son with the same surname), the customer gets it.
  const customerVariants = new Set(entities.filter((e) => e.isCustomer).flatMap((e) => e.variants.map(fold)));
  const customerEmail = c.record.customer.email?.toLowerCase();

  const runPattern = (text: string, p: (typeof PATTERNS)[number], documentId: string) => {
    const found = findAll(text, p.source, p.flags, "", "pattern", p.group ?? 0).filter((m) => !/\[[A-Z_0-9]+\]/.test(text.slice(m.start, m.end)));
    for (const m of found) {
      const value = text.slice(m.start, m.end);
      if (p.kind === "EMAIL" && value.toLowerCase() === customerEmail) {
        m.placeholder = "[CUSTOMER_EMAIL]";
        m.layer = "record";
        continue;
      }
      const key = `${p.kind}:${value.replace(/\s/g, "").toLowerCase()}`;
      if (!patternValues.has(key)) {
        patternCounts[p.kind] = (patternCounts[p.kind] ?? 0) + 1;
        patternValues.set(key, `[${p.kind}_${patternCounts[p.kind]}]`);
      }
      m.placeholder = patternValues.get(key)!;
    }
    const r = applyMatches(text, found);
    for (const m of r.applied) replacements.push({ placeholder: m.placeholder, original: text.slice(m.start, m.end), layer: m.layer, documentId });
    return r.text;
  };

  const documents = c.documents.map((doc) => {
    // Emails first, so a name inside an address does not split it in two.
    let text = runPattern(doc.text, EMAIL_PATTERN, doc.id);
    const afterEmails = text;

    // Layer 1: the record dictionary.
    const layer1: Match[] = [];
    for (const e of entities) {
      for (const v of [...e.variants].sort((a, b) => b.length - a.length)) {
        if (!e.isCustomer && customerVariants.has(fold(v))) continue;
        // Short single words ("Pat", "Will", "Mo") only match when capitalised, so ordinary words survive.
        const short = v.length <= 4 && !/\s/.test(v);
        const source = short ? `(?:${escapeRegex(v[0].toUpperCase() + v.slice(1))}|${escapeRegex(v.toUpperCase())})` : variantPattern(v);
        layer1.push(...findAll(text, WORD_BEFORE + source + WORD_AFTER, short ? "gu" : "giu", e.placeholder, "record"));
      }
      for (const v of e.exactVariants) {
        layer1.push(...findAll(text, WORD_BEFORE + escapeRegex(v) + WORD_AFTER, "gu", e.placeholder, "record"));
      }
    }
    for (const n of numbers) {
      layer1.push(...findAll(text, `(?<!\\d)${n.pattern}(?!\\d)`, "gu", n.placeholder, "record"));
    }
    const r1 = applyMatches(text, layer1);
    for (const m of r1.applied) replacements.push({ placeholder: m.placeholder, original: afterEmails.slice(m.start, m.end), layer: "record", documentId: doc.id });
    text = r1.text;

    // Layer 2: patterns. Run one pattern at a time so the most specific wins (a sort code is not read as a phone number).
    for (const p of PATTERNS) text = runPattern(text, p, doc.id);

    // Layer 3: near matches. A title plus a name, or a capitalised word close to a known name.
    const near: Match[] = [];
    const titled = new RegExp(`${WORD_BEFORE}(?:${TITLES.join("|")}|${TITLES.map((t) => t.toUpperCase()).join("|")})\\.?\\s+(?:[A-Z]\\.?\\s+)?([A-Z][\\p{L}'’-]{2,})`, "gu");
    for (const m of text.matchAll(titled)) {
      if (m.index === undefined || m[0].includes("[")) continue;
      const e = closestEntity(m[1], entities, 3);
      near.push({ start: m.index, end: m.index + m[0].length, placeholder: e?.placeholder ?? "[PERSON]", layer: "near_match" });
    }
    for (const m of text.matchAll(/(?<![\p{L}\[])([A-Z][\p{L}'’-]{4,})(?![\p{L}\]])/gu)) {
      if (m.index === undefined) continue;
      const word = m[1];
      const e = closestEntity(word, entities, word.length >= 8 ? 2 : 1);
      if (e && !e.names.some((n) => fold(n) === fold(word))) {
        near.push({ start: m.index, end: m.index + word.length, placeholder: e.placeholder, layer: "near_match" });
      }
    }
    const before3 = text;
    const r3 = applyMatches(text, near);
    for (const m of r3.applied) replacements.push({ placeholder: m.placeholder, original: before3.slice(m.start, m.end), layer: "near_match", documentId: doc.id });
    text = r3.text;

    return { id: doc.id, system: doc.system, type: doc.type, date: doc.date, author_role: doc.author_role, text };
  });

  const placeholders = [...new Set(replacements.map((r) => r.placeholder))].sort();
  return { id: c.id, received: c.received, channel: c.channel, documents, replacements, placeholders };
}

/** Placeholders in AI output that redaction never created. The AI must not invent people. */
export function findInventedPlaceholders(output: string, known: string[]): string[] {
  const knownSet = new Set(known);
  const found = output.match(/\[[A-Z][A-Z_]*(?:_\d+)?\]/g) ?? [];
  return [...new Set(found.filter((p) => !knownSet.has(p)))];
}

/** Puts real values back for display to the handler. Uses the first original seen for each placeholder. */
export function restore(text: string, replacements: Replacement[]): string {
  const map = new Map<string, string>();
  for (const r of replacements) if (!map.has(r.placeholder)) map.set(r.placeholder, r.original);
  return text.replace(/\[[A-Z][A-Z_]*(?:_\d+)?\]/g, (p) => map.get(p) ?? p);
}
