/**
 * Provenance check. Every statement in a case pack must cite a source (a case document such as "D2",
 * or a policy paragraph such as "CP-7.2") and quote words from it. Code, not AI, checks the quote
 * really is in that source.
 *
 * What this proves: the quoted words exist in the named source.
 * What it does NOT prove: that the quote supports the statement. That judgement is the handler's,
 * which is why every pack is reviewed by a person.
 *
 * Matching ignores case, curly vs straight quotes, dash styles and extra spaces, so the live demo does not
 * show false failures. A quote may use "..." to skip words, and each fragment must then appear in order.
 */

export interface Citation {
  source: string;
  quote: string;
}

export type CitationResult = "verified" | "quote_not_found" | "unknown_source" | "quote_too_short";

export interface CheckedCitation extends Citation {
  result: CitationResult;
}

export interface CheckedItem {
  supported: boolean;
  citations: CheckedCitation[];
}

const MIN_QUOTE_CHARS = 8;

export function normalise(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[‘’‚‛′`]/g, "'")
    .replace(/[“”„‟″]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function trimQuote(s: string): string {
  return s.replace(/^[\s"'.,;:]+|[\s"'.,;:]+$/g, "");
}

export function checkCitation(c: Citation, sources: Record<string, string>): CheckedCitation {
  const text = sources[c.source];
  if (text === undefined) return { ...c, result: "unknown_source" };
  const fragments = normalise(c.quote).split(/\s*(?:\.\.\.|…)\s*/).map(trimQuote).filter(Boolean);
  if (fragments.join("").length < MIN_QUOTE_CHARS) return { ...c, result: "quote_too_short" };
  const haystack = normalise(text);
  let from = 0;
  for (const f of fragments) {
    const at = haystack.indexOf(f, from);
    if (at === -1) return { ...c, result: "quote_not_found" };
    from = at + f.length;
  }
  return { ...c, result: "verified" };
}

/** An item is supported only if it has at least one citation and every citation verifies. */
export function checkItem(citations: Citation[], sources: Record<string, string>): CheckedItem {
  const checked = citations.map((c) => checkCitation(c, sources));
  return { supported: checked.length > 0 && checked.every((c) => c.result === "verified"), citations: checked };
}
