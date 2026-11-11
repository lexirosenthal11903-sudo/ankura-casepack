import { describe, expect, it } from "vitest";
import { redactCase } from "@/lib/redact";
import { buildTryCase, EXAMPLE_COMPLAINT, validateTryInput } from "@/lib/try-case";

const good = { name: "Sam Okafor", text: EXAMPLE_COMPLAINT, confirmed: true };

describe("try your own complaint", () => {
  it("refuses without the fictional-only confirmation", () => {
    expect(validateTryInput({ ...good, confirmed: false }).ok).toBe(false);
  });
  it("refuses text that is too short or too long, and names that are not names", () => {
    expect(validateTryInput({ ...good, text: "too short" }).ok).toBe(false);
    expect(validateTryInput({ ...good, text: "x".repeat(2_600) }).ok).toBe(false);
    expect(validateTryInput({ ...good, name: "07700 900 123" }).ok).toBe(false);
    expect(validateTryInput(good).ok).toBe(true);
  });
  it("builds a case the normal pipeline can redact, hiding the phone, the account digits and the partner's name", () => {
    const v = validateTryInput(good);
    if (!v.ok) throw new Error(v.error);
    const c = buildTryCase(v.input, "2026-11-09");
    const r = redactCase(c);
    const seen = r.documents[0].text;
    expect(seen).not.toContain("07700 900 123");
    expect(seen).not.toContain("Dean");
    expect(seen).not.toContain("Sam");
    expect(seen).toContain("£6 a day");
  });
});
