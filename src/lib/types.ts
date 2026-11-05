/** Shapes of the data files in /data. See data/README.md. */

export type PartyRole = "EXECUTOR" | "DECEASED" | "POWER_OF_ATTORNEY" | "CMC" | "THIRD_PARTY";

export interface CaseRecord {
  customer: {
    name: string;
    title?: string;
    dob?: string;
    address?: string;
    postcode?: string;
    phone?: string;
    email?: string;
  };
  accounts: { product: string; sort_code?: string; number?: string; card_last4?: string }[];
  other_parties: { role: PartyRole; name?: string; organisation?: string }[];
  staff: { name: string; role?: string }[];
}

export interface CaseDocument {
  id: string;
  system: "CRM" | "CORE" | "CARDS" | "EMAIL" | "LETTER" | "WEBFORM" | "BRANCH";
  type: string;
  date: string;
  author_role: string;
  text: string;
}

export interface CaseFile {
  id: string;
  split: "dev" | "heldout";
  author: "claude" | "lexi";
  received: string;
  channel: "phone" | "email" | "web_form" | "branch" | "letter" | "social";
  record: CaseRecord;
  documents: CaseDocument[];
}
