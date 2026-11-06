import { describe, expect, it } from "vitest";
import { buildDisplay, findInventedPlaceholders, redactCase, restore } from "@/lib/redact";
import type { CaseFile } from "@/lib/types";

function makeCase(text: string, overrides: Partial<CaseFile["record"]> = {}): CaseFile {
  return {
    id: "T-1", split: "dev", author: "claude", received: "2026-11-02", channel: "email",
    record: {
      customer: { name: "Patricia Hollins", title: "Mrs", phone: "01632 960 111", email: "pat.h@example.com", postcode: "LS1 4AB" },
      accounts: [{ product: "current_account", sort_code: "77-41-05", number: "31560482", card_last4: "7731" }],
      other_parties: [{ role: "POWER_OF_ATTORNEY", name: "Karen Doherty" }],
      staff: [{ name: "Ravi Patel", role: "Branch" }],
      ...overrides,
    },
    documents: [{ id: "D1", system: "CRM", type: "crm_note", date: "2026-11-02", author_role: "handler", text }],
  };
}
const redact = (text: string, o?: Partial<CaseFile["record"]>) => redactCase(makeCase(text, o)).documents[0].text;

describe("record dictionary", () => {
  it("replaces name variants with role placeholders", () => {
    expect(redact("Mrs Hollins called. Pat said Karen Doherty holds the LPA.")).toBe("[CUSTOMER] called. [CUSTOMER] said [POWER_OF_ATTORNEY] holds the LPA.");
  });
  it("catches account numbers written with spaces and the last four digits", () => {
    expect(redact("Acct 3156 0482, card ending 7731, account ending 0482")).toBe("Acct [ACCOUNT], card ending [CARD], account ending [ACCOUNT]");
  });
  it("catches staff initials and usernames", () => {
    expect(redact("Advised cust. - RP")).toBe("Advised cust. - [STAFF]");
    expect(redact("keyed by RPATEL")).toBe("keyed by [STAFF]");
  });
  it("gives a shared surname to the customer, not the relative", () => {
    const out = redact("Mrs Ellison called. David Ellison is her son.", {
      customer: { name: "Margaret Ellison", title: "Mrs" },
      other_parties: [{ role: "THIRD_PARTY", name: "David Ellison" }],
    });
    expect(out).toBe("[CUSTOMER] called. [THIRD_PARTY] is her son.");
  });
  it("ignores accents when matching", () => {
    expect(redact("Signed Agnieszka Wójcik", { customer: { name: "Agnieszka Wojcik" } })).toBe("Signed [CUSTOMER]");
  });
});

describe("does not over-redact", () => {
  it("leaves ordinary words that look like short names", () => {
    expect(redact("I will pat the dog again and more money", { customer: { name: "William Moore", title: "Mr" } })).toBe("I will pat the dog again and more money");
  });
  it("leaves dates, amounts and reference numbers", () => {
    const text = "On 22/10/2026 she paid £4,800. Incident INC-2026-1030-01.";
    expect(redact(text)).toBe(text);
  });
});

describe("patterns for identifiers not in the record", () => {
  it("catches unknown emails, phones and postcodes, numbering each value", () => {
    expect(redact("Son: dave99@example.com, 07700 900 222 or 07700 900 333, lives at SY3 7PL")).toBe(
      "Son: [EMAIL_1], [PHONE_1] or [PHONE_2], lives at [POSTCODE_1]",
    );
  });
  it("uses the customer's own email placeholder when it matches the record", () => {
    expect(redact("Reply to pat.h@example.com please")).toBe("Reply to [CUSTOMER_EMAIL] please");
  });
});

describe("near matches", () => {
  it("treats a misspelt surname after a title as the customer", () => {
    expect(redact("Spoke to Mrs Hollings today")).toBe("Spoke to [CUSTOMER] today");
  });
  it("treats an unknown titled name as a person", () => {
    expect(redact("Letting agent Mr Okonkwo called")).toBe("Letting agent [PERSON] called");
  });
});

describe("placeholder checks", () => {
  it("finds placeholders the AI invented", () => {
    expect(findInventedPlaceholders("[CUSTOMER] told [EXECUTOR] and [STAFF_3]", ["[CUSTOMER]", "[STAFF_1]"])).toEqual(["[EXECUTOR]", "[STAFF_3]"]);
  });
  it("restores real values for the handler's screen", () => {
    const r = redactCase(makeCase("Mrs Hollins called"));
    expect(restore("[CUSTOMER] wants a refund", r.replacements)).toBe("Mrs Hollins wants a refund");
  });
  it("shows the person's proper name, not a misspelling seen first in the notes", () => {
    const c = makeCase("Spoke to Mrs Hollings. Mrs Hollins said ok.");
    const r = redactCase(c);
    const display = buildDisplay(c.record, r.replacements);
    expect(restore("[CUSTOMER] wants a refund", r.replacements, display)).toBe("Mrs Patricia Hollins wants a refund");
    expect(restore("Account [ACCOUNT]", r.replacements, display)).toBe("Account 31560482");
  });
});
