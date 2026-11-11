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

describe("people the record does not know (layer 4)", () => {
  it("hides a person introduced by a relationship, and every later mention", () => {
    expect(redact("My boyfriend Josh drove us there. Josh waited. Thanks\nPat")).toBe("My boyfriend [PERSON_1] drove us there. [PERSON_1] waited. Thanks\n[CUSTOMER]");
  });
  it("hides someone 'called' or 'named', including a staff nickname", () => {
    expect(redact("I spoke to a lady called Bev.", { staff: [{ name: "Beverley Nolan", role: "Payments" }] })).toBe("I spoke to a lady called [STAFF].");
    expect(redact("A man named Paul rang.")).toBe("A man named [PERSON_1] rang.");
  });
  it("hides a scammer's name and a payee name as the bank system writes it", () => {
    expect(redact("He said his name was Ryan and the account name was R TARRANT. Ryan went quiet.")).toBe("He said his name was [PERSON_1] and the account name was R [PERSON_2]. [PERSON_1] went quiet.");
    expect(redact("FP out GBP 800.00 payee R CALLOWAY, CoP CLOSE MATCH (actual name RICHARD CALLOWAY).")).toBe("FP out GBP 800.00 payee R [PERSON_1], CoP CLOSE MATCH (actual name [PERSON_1] [PERSON_1]).");
  });
  it("keeps company payees, because a care home or a solicitor is evidence", () => {
    expect(redact("DD to BROOKVALE HOME CARE and FP to WETHERBY LANE SOLICITORS CLIENT A/C")).toBe("DD to BROOKVALE HOME CARE and FP to WETHERBY LANE SOLICITORS CLIENT A/C");
    expect(redact("Payment HELD for review, to Tallis Street Bank")).toBe("Payment HELD for review, to Tallis Street Bank");
  });
  it("hides children listed with ages, and keeps ordinary sentences", () => {
    expect(redact("the children (Niamh is 9 and Cathal is 6, they were upset)")).toBe("the children ([PERSON_1] is 9 and [PERSON_2] is 6, they were upset)");
    expect(redact("It is 6 weeks since. This is 1 of 3.")).toBe("It is 6 weeks since. This is 1 of 3.");
  });
  it("hides a date of birth read out on a call", () => {
    expect(redact("Caller: Fourteenth of May, nineteen fifty-two. LS8 2JR.")).toBe("Caller: [DATE_OF_BIRTH]. [POSTCODE_1].");
  });
  it("hides a sign-off that is only a first name and an initial", () => {
    const out = redactCase({ ...makeCase("email is best.\n\nTom W."), documents: [{ id: "D1", system: "EMAIL", type: "email", date: "2026-11-02", author_role: "customer", text: "email is best.\n\nTom W." }] }).documents[0].text;
    expect(out).toBe("email is best.\n\n[PERSON_1] W.");
  });
  it("does not hide 'mo' or 'will' in ordinary words when Mo or Will is a person", () => {
    expect(redact("'maybe you're right, Mo' she said a month ago.", { other_parties: [{ role: "THIRD_PARTY", name: "Maureen Doherty" }] })).toBe("'maybe you're right, [THIRD_PARTY]' she said a month ago.");
  });
});
