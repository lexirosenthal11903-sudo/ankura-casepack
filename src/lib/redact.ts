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
 * 4. People the record does not know. A boyfriend, a scammer, a carer or a child who is only ever named in the
 *    text. Found from how people are introduced ("my partner Ewa", "a lady called Bev", "his name was Ryan",
 *    "payee R HOLLIS", a sign-off), then every later mention of that name is hidden too. Added after the
 *    held-back test showed 23 of 101 planted identifiers missed, all of this kind. See docs/decisions.md.
 *
 * Dates and amounts are kept, because deadlines and the case facts need them.
 * Placeholders are role-typed ([CUSTOMER], [EXECUTOR], [STAFF_1]) so the AI can still follow who did what.
 *
 * This is not perfect and is never described as perfect. evals/redaction measures how many planted
 * identifiers it catches, and the result is reported as a percentage.
 */
import type { CaseFile, CaseRecord, PartyRole } from "./types";

export type Layer = "record" | "pattern" | "near_match" | "text";

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
  /** Placeholder to the proper value shown to the handler, for example [CUSTOMER] to "Mrs Margaret Ellison". */
  display?: Record<string, string>;
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
  andrew: ["Andy", "Drew"], beverley: ["Bev"], beverly: ["Bev"], maureen: ["Mo"], mohammed: ["Mo"], mohammad: ["Mo"], muhammad: ["Mo"], anthony: ["Tony"], benjamin: ["Ben"], catherine: ["Cath", "Kate", "Cathy"],
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
  if (first.length >= 4) variants.add(first.slice(0, -1)); // "Kof" for Kofi in a rushed note (matched capitalised only, see below)
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
  { kind: "CARD_DIGITS", source: "(?:ending(?: in| with)?|ends(?: in| with)?|last (?:4|four)(?: digits)?(?: of [\\w ]{1,20}?)?|card|acc(?:oun)?t)(?: (?:number|no\\.?|num))?(?: (?:ending|ends)(?: in| with)?)?[:\\s]+(?:no\\.?\\s*)?(\\d{4})(?!\\d)", flags: "giu", group: 1 },
  { kind: "ADDRESS", source: `${WORD_BEFORE}(?:Flat \\d+[A-Za-z]?,?\\s+)?\\d{1,4}[A-Za-z]?\\s+(?:(?:[A-Z][a-z]+|[A-Z]{3,})\\s){1,3}(?:Road|Rd|Street|St|Lane|Ln|Avenue|Ave|Close|Cl|Drive|Dr|Way|Court|Ct|Place|Pl|Crescent|Cres|Gardens|Gdns|Terrace|Grove|Mews|Row|Walk|Square|Sq|Hill|Park|ROAD|RD|STREET|ST|LANE|LN|AVENUE|AVE|CLOSE|CL|DRIVE|DR|WAY|COURT|CT|PLACE|PL|CRESCENT|CRES|GARDENS|GDNS|TERRACE|GROVE|MEWS|ROW|WALK|SQUARE|SQ|HILL|PARK)\\b`, flags: "gu" },
  { kind: "STAFF", source: "(?:^|\\s)[-–]\\s?([A-Z]{2,3})\\.?\\s*$", flags: "gmu", group: 1 },
  { kind: "STAFF", source: "\\b(?:user|by|agent|handler)[:\\s]+([A-Z]{5,})\\b", flags: "gu", group: 1 },
];

const EMAIL_PATTERN: (typeof PATTERNS)[number] = { kind: "EMAIL", source: "[\\w.+-]+@[\\w-]+(?:\\.[\\w-]+)+", flags: "giu" };


// Layer 4. People the record does not know, found from how they are introduced in the text.
const RELATIONS = "boyfriend|girlfriend|partner|husband|wife|ex|son|daughter|sister|brother|mum|mother|dad|father|parents|friend|carer|neighbour|neighbor|grandson|granddaughter|grandmother|grandfather|nan|grandad|nephew|niece|cousin|aunt|auntie|uncle|flatmate|housemate|lodger|colleague|boss|landlord|solicitor|accountant|doctor|GP|nurse|support worker|social worker|children|kids";
const NAME = "([A-Z][\\p{L}'’-]{1,})";
const NAME_STOP = new Set(["I", "It", "Its", "This", "That", "These", "Those", "He", "She", "They", "We", "You", "The", "There", "Which", "What", "When", "Who", "Why", "How", "And", "But", "So", "Then", "Now", "Also", "If", "As", "At", "In", "On", "For", "From", "With", "My", "Our", "Your", "His", "Her", "Their", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "Bank", "Branch", "Customer", "Agent", "Caller", "Subject", "Dear", "Hi", "Hello", "Thanks", "Regards", "Please", "Sorry", "Yes", "No", "Not", "Nothing", "Everything", "Someone", "Nobody", "Harbour", "Vale", "GBP", "CHAPS", "FP", "DD", "CRM", "ID"]);
const PERSON_INTROS: string[] = [
  // "my boyfriend Josh", "our daughter Abena", "my late father Brendan", "my carer Joyce", "my partner Sami took"
  `(?:[Mm]y|[Oo]ur|[Hh]is|[Hh]er|[Tt]heir)\\s+(?:late\\s+|younger\\s+|older\\s+|elder\\s+|eldest\\s+|youngest\\s+|ex-?\\s*)?(?:${RELATIONS})(?:,)?\\s+(?:called\\s+|named\\s+)?${NAME}`,
  // "a lady called Bev", "someone called Dave", "a man named Paul", "the agent, Lewis,"
  `(?:[Cc]alled|[Nn]amed|by the name of)\\s+${NAME}`,
  // "his name was Ryan", "he calls himself Richard", "she goes by Mo"
  `(?:[Hh]is|[Hh]er|[Tt]heir|[Mm]y)\\s+name\\s+(?:is|was)\\s+${NAME}`,
  `calls?\\s+(?:himself|herself|themselves)\\s+${NAME}`,
  // "(Niamh is 9 and Cathal is 6" -- children listed with ages
  `${NAME}\\s+is\\s+\\d{1,2}(?![\\d.,]\\d)`,
  // "Craig deals with the money" -- someone else controlling the finances is also a coercion sign
  `${NAME}\\s+(?:deals with|looks after|handles|controls|manages|sorts out)\\s+(?:the|our|my|her|his|all the)\\s+(?:money|finances|accounts?|bills)`,
  // "the money Dennis left her when he died"
  `${NAME}\\s+left\\s+(?:her|him|them|me|us)\\b`,
];
// Payee names as a bank system writes them: "payee R HOLLIS", "to C ASHWORTH", "actual name RICHARD CALLOWAY", "account name was R HOLLIS".
// Two words at most: an initial or first name, then a surname. Three capitalised words is nearly always a company,
// and a company name is evidence (a care home, a firm of solicitors), so it stays.
const PAYEE_INTRO = `(?:[Pp]ayee|to|from|[Aa]ccount name(?: was| is)?|actual name|in the name of|name on the account|beneficiary)[:\\s]+'?((?:[A-Z]\\s|[A-Z]{3,}\\s)[A-Z]{3,})'?(?![\\p{L}\\p{N}*]|\\s[A-Z]{2,})`;
const ORG_WORDS = /\b(?:LTD|LIMITED|PLC|LLP|INC|CO|SERVICES|SOLICITORS|LETTINGS|PROPERTY|PROPERTIES|HOME|HOMES|CARE|BANK|DIGITAL|GROUP|HOLDINGS|TRADING|STORE|STORES|SHOP|COUNCIL|ENERGY|INSURANCE|CLIENT|ACCOUNT|TOPUP|MOTORS|TRAVEL|HOTEL|HOTELS|FINANCE|CAPITAL|PAYMENTS|DIRECT|ONLINE|UK|GB)\b/;
// A date of birth read out on a call: "Fourteenth of May, nineteen fifty-two".
const SPOKEN_DOB = "\\b(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|eleventh|twelfth|thirteenth|fourteenth|fifteenth|sixteenth|seventeenth|eighteenth|nineteenth|twentieth|twenty-(?:first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)|thirtieth|thirty-first)\\s+(?:of\\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December),?\\s+(?:nineteen|twenty)(?:[\\s-][\\p{L}-]+){1,2}";
// A sign-off on its own line at the end of a message: "Thanks\\nChloe", "Kind regards,\\n\\nTom W."
const LAST_LINE = "\\n[ \\t]*\\n[ \\t]*([A-Z][\\p{L}'’-]+(?:[ \\t]+[A-Z][\\p{L}'’.-]*)?)\\.?[ \\t]*\\n?[ \\t]*$";
const SIGN_OFF = "(?:Thanks|Thank you|Many thanks|Regards|Kind regards|Best regards|Best wishes|Best|Cheers|Yours sincerely|Yours faithfully|Yours|Sincerely),?\\s*\\n+\\s*([A-Z][\\p{L}'’-]+(?:\\s+[A-Z][\\p{L}'’.-]*)?)\\.?\\s*$";

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
      // On a tie the customer wins, so "Mrs Mensha" is the customer and not her late husband who shares the surname.
      if (d <= maxDistance && (!best || d < best.d || (d === best.d && e.isCustomer))) best = { e, d };
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

  // Layer 4, first pass: people the record does not know, found from how the text introduces them.
  // Found once for the whole case, so "Ryan" in the email and "Ryan" in the notes get the same placeholder.
  const textPeople = new Map<string, string>(); // folded name -> placeholder
  let personCount = 0;
  const knownNames = new Set(entities.flatMap((e) => e.names.concat(e.variants)).map(fold));
  const addPerson = (raw: string) => {
    const name = raw.replace(/[.,'’]+$/, "").trim();
    const parts0 = name.split(/\s+/).map((x) => x.replace(/[.']+$/, ""));
    const first = parts0.find((x) => x.length >= 2) ?? "";
    if (!first || NAME_STOP.has(first) || parts0.some((x) => NAME_STOP.has(x))) return;
    if (knownNames.has(fold(name)) || knownNames.has(fold(first))) return; // the record layer already covers them
    if (closestEntity(first, entities, first.length >= 8 ? 2 : 1)) return; // a misspelling of someone known, left to layer 3
    for (const part of name.split(/\s+/)) {
      const key = fold(part.replace(/[.']+$/, ""));
      if (key.length < 2 || NAME_STOP.has(part)) continue;
      if (!textPeople.has(key)) textPeople.set(key, "");
    }
    const key = fold(first);
    if (textPeople.get(key) === "") {
      // "RICHARD CALLOWAY" after "R CALLOWAY" is the same person, so the surname's placeholder is reused.
      const existing = name.split(/\s+/).map((x) => textPeople.get(fold(x.replace(/[.']+$/, "")))).find((t) => t);
      const tag = existing ?? `[PERSON_${(personCount += 1)}]`;
      for (const part of name.split(/\s+/)) {
        const k = fold(part.replace(/[.']+$/, ""));
        if (textPeople.get(k) === "") textPeople.set(k, tag);
      }
    }
  };
  for (const doc of c.documents) {
    for (const source of PERSON_INTROS) {
      for (const m of doc.text.matchAll(new RegExp(WORD_BEFORE + source, "gu"))) if (m[1]) addPerson(m[1]);
    }
    for (const m of doc.text.matchAll(new RegExp(PAYEE_INTRO, "gu"))) if (m[1] && !ORG_WORDS.test(m[1])) addPerson(m[1]);
    for (const m of doc.text.matchAll(new RegExp(SIGN_OFF, "gu"))) if (m[1]) addPerson(m[1]);
    if (doc.author_role === "customer" || doc.author_role === "third_party") for (const m of doc.text.matchAll(new RegExp(LAST_LINE, "gu"))) if (m[1]) addPerson(m[1]);
  }
  const textPeopleList = [...textPeople.entries()].filter(([, tag]) => tag).sort((a, b) => b[0].length - a[0].length);

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
    const titled = new RegExp(`${WORD_BEFORE}(?:${TITLES.join("|")}|${TITLES.map((t) => t.toUpperCase()).join("|")})\\.?[ \\t]+(?:[A-Z]\\.?[ \\t]+)?([A-Z][\\p{L}'’-]{2,})`, "gu");
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

    // Layer 4, second pass: every mention of a person found in the text, and a date of birth read out on a call.
    const layer4: Match[] = [];
    for (const [name, tag] of textPeopleList) {
      // Capitalised only, so "Mo" the sister does not hide "mo" in "a month or so" and "Will" the nephew does not hide "will".
      const cap = name[0].toUpperCase() + name.slice(1);
      layer4.push(...findAll(text, `${WORD_BEFORE}(?:${escapeRegex(cap[0])}${variantPattern(name.slice(1))}|${escapeRegex(name.toUpperCase())})${WORD_AFTER}`, "gu", tag, "text"));
    }
    layer4.push(...findAll(text, SPOKEN_DOB, "giu", "[DATE_OF_BIRTH]", "text"));
    const before4 = text;
    const r4 = applyMatches(text, layer4.filter((m) => !/\[[A-Z_0-9]+\]/.test(text.slice(m.start, m.end))));
    for (const m of r4.applied) replacements.push({ placeholder: m.placeholder, original: before4.slice(m.start, m.end), layer: "text", documentId: doc.id });
    text = r4.text;

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

/**
 * The proper value to show the handler for each placeholder. People get their full name from the bank's record
 * (not whatever spelling a note used), accounts their number. Pattern finds fall back to the first value seen.
 */
export function buildDisplay(record: CaseRecord, replacements: Replacement[]): Record<string, string> {
  const display: Record<string, string> = {};
  for (const r of replacements) if (!(r.placeholder in display)) display[r.placeholder] = r.original;
  const people = buildEntities(record);
  const named = [
    ...record.other_parties.filter((p) => p.name && !(p.role === "DECEASED" && p.name === record.customer.name)).map((p) => p.name!),
    `${record.customer.title ? record.customer.title + " " : ""}${record.customer.name}`,
    ...record.staff.map((s) => s.name),
  ];
  people.forEach((e, i) => { display[e.placeholder] = named[i]; });
  record.accounts.forEach((a, i) => {
    const tag = record.accounts.length > 1 ? `[ACCOUNT_${i + 1}]` : "[ACCOUNT]";
    if (a.number) display[tag] = a.number;
    if (a.card_last4) display["[CARD]"] = a.card_last4;
    if (a.sort_code) display["[SORT_CODE]"] = a.sort_code;
  });
  if (record.customer.phone) display["[CUSTOMER_PHONE]"] = record.customer.phone;
  if (record.customer.email) display["[CUSTOMER_EMAIL]"] = record.customer.email;
  return display;
}

/** Puts real values back for display to the handler. */
export function restore(text: string, replacements: Replacement[], display?: Record<string, string>): string {
  const map = new Map<string, string>(Object.entries(display ?? {}));
  for (const r of replacements) if (!map.has(r.placeholder)) map.set(r.placeholder, r.original);
  return text.replace(/\[[A-Z][A-Z_]*(?:_\d+)?\]/g, (p) => map.get(p) ?? p);
}
