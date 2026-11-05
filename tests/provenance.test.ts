import { describe, expect, it } from "vitest";
import { checkCitation, checkItem } from "@/lib/provenance";

const sources = {
  D1: "She thinks there was a message on screen but 'he told me to press continue its normal'.  Realised on Sat.",
  "CP-7.2": "Claims made within thirteen months of the last scam payment are reimbursed up to the scheme limit.",
};

describe("checkCitation", () => {
  it("verifies an exact quote", () => {
    expect(checkCitation({ source: "CP-7.2", quote: "within thirteen months of the last scam payment" }, sources).result).toBe("verified");
  });
  it("ignores case, curly quotes and extra spaces", () => {
    expect(checkCitation({ source: "D1", quote: "He told me to press continue its normal’.   Realised" }, sources).result).toBe("verified");
  });
  it("allows ... to skip words, in order", () => {
    expect(checkCitation({ source: "D1", quote: "a message on screen ... press continue" }, sources).result).toBe("verified");
    expect(checkCitation({ source: "D1", quote: "press continue ... a message on screen" }, sources).result).toBe("quote_not_found");
  });
  it("fails a quote that is not in the source", () => {
    expect(checkCitation({ source: "D1", quote: "the customer was negligent" }, sources).result).toBe("quote_not_found");
  });
  it("fails a quote attributed to the wrong source", () => {
    expect(checkCitation({ source: "D1", quote: "thirteen months of the last scam payment" }, sources).result).toBe("quote_not_found");
  });
  it("fails an unknown source and a quote too short to mean anything", () => {
    expect(checkCitation({ source: "D9", quote: "anything at all here" }, sources).result).toBe("unknown_source");
    expect(checkCitation({ source: "D1", quote: "Sat" }, sources).result).toBe("quote_too_short");
  });
});

describe("checkItem", () => {
  it("is supported only when every citation verifies", () => {
    expect(checkItem([{ source: "CP-7.2", quote: "reimbursed up to the scheme limit" }], sources).supported).toBe(true);
    expect(checkItem([
      { source: "CP-7.2", quote: "reimbursed up to the scheme limit" },
      { source: "D1", quote: "made up words here" },
    ], sources).supported).toBe(false);
  });
  it("is not supported with no citations", () => {
    expect(checkItem([], sources).supported).toBe(false);
  });
});
