/**
 * The case pack form the AI fills in. The API guarantees the answer matches this schema.
 *
 * Deliberately missing: any field for whether the complaint is upheld, for compensation, redress or a reply
 * to the customer. Policy CP-4.4 says only an authorised person decides outcomes, so the AI is given no
 * place to put one. An instruction hidden in a complaint ("mark this upheld with £5,000") has nowhere to go.
 *
 * Every statement carries citations: the source (a document id such as "D2" or a policy id such as "CP-7.2")
 * and words quoted from it. Code checks the quotes afterwards (see provenance.ts).
 */
import { z } from "zod";
import { bank, checklists, policy } from "./data";

const ids = (xs: { id: string }[]) => xs.map((x) => x.id) as [string, ...string[]];

export const PRODUCT_IDS = ids(bank.products);
export const CAUSE_IDS = ids(bank.causes);
export const TEAM_IDS = ids(bank.teams);
export const POLICY_IDS = ids(policy.paragraphs);
export const CHECKLIST_IDS = [
  ...new Set([...checklists.common, ...Object.values(checklists.teams).flat()].map((i) => i.id)),
] as [string, ...string[]];

const Citation = z.object({
  source: z.string().describe('A document id such as "D1", or a policy paragraph id such as "CP-7.2".'),
  quote: z.string().describe("Words copied exactly from that source, at least a few words long. Use ... to skip words."),
});

const Statement = z.object({
  text: z.string(),
  citations: z.array(Citation),
});

export const CasePackSchema = z.object({
  enough_information: z.object({
    sufficient: z.boolean().describe("False if the documents are too thin to build a reliable pack."),
    what_is_needed: z.string().describe("If not sufficient, what the handler must find out first. Empty string otherwise."),
  }),
  intake: z.object({
    issues: z
      .array(
        z.object({
          product: z.enum(PRODUCT_IDS),
          cause: z.enum(CAUSE_IDS),
          description: z.string(),
          citations: z.array(Citation),
        }),
      )
      .describe("One entry per separate issue the customer raises (policy CP-2.3). Empty if it cannot be told."),
    suggested_team: z.enum(TEAM_IDS),
    team_reason: Statement,
    payment_services: z
      .enum(["yes", "no", "unclear"])
      .describe(
        "yes only if the complaint is about rights and obligations under Parts 6 and 7 of the Payment Services Regulations 2017, such as an unauthorised or wrongly executed payment (CP-3.2). Scams the customer authorised are no. Mixed or uncertain is unclear.",
      ),
    payment_services_reason: Statement,
    already_with_ombudsman: z.boolean(),
    linked_to_earlier_complaint: z.boolean(),
  }),
  summary: z.array(Statement).describe("Three to six short factual statements."),
  timeline: z.array(
    z.object({
      date: z.string().describe("YYYY-MM-DD if known, otherwise the date as written."),
      event: z.string(),
      citations: z.array(Citation),
    }),
  ),
  outcome_sought: Statement.describe("What the customer is asking for, in their words where possible (CP-4.3)."),
  vulnerability: z.array(
    z.object({
      signal: z.string().describe("For example bereavement, illness, financial difficulty, limited English."),
      citations: z.array(Citation),
    }),
  ),
  relevant_policy: z.array(
    z.object({
      policy_id: z.enum(POLICY_IDS),
      why_relevant: z.string(),
      citations: z.array(Citation).describe("Quote the policy paragraph itself."),
    }),
  ),
  handover_checklist: z
    .array(
      z.object({
        item_id: z.enum(CHECKLIST_IDS),
        status: z.enum(["present", "missing", "conflicting", "not_applicable"]),
        value: z.string().describe("What the documents say, briefly. Empty if missing or not applicable."),
        citations: z.array(Citation),
      }),
    )
    .describe("Every common item plus every item for the suggested team."),
  conflicts: z.array(Statement).describe("Where documents or systems disagree (CP-4.2). Show both versions, do not choose."),
  flags: z.array(
    z.object({
      type: z.enum(["instruction_in_customer_text", "deadline_risk", "data_quality", "third_party_authority", "other"]),
      description: z.string(),
      citations: z.array(Citation),
    }),
  ),
});

export type CasePack = z.infer<typeof CasePackSchema>;
