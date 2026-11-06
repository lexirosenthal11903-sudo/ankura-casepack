/** Small rules applied by code to the AI's case pack. Pure, so they run on the server and in the browser. */
import type { Clock } from "./deadlines";
import type { CasePack } from "./schema";

/** Which DISP time limit the AI's payment services answer implies. "unclear" means a person must confirm. */
export function clockFromPack(pack: CasePack): Clock {
  return pack.intake.payment_services === "yes" ? "15_business_days" : pack.intake.payment_services === "unclear" ? "confirm" : "8_weeks";
}

/** True when the case is categorised as an unauthorised payment, so the next-business-day refund duty (CP-7.1) applies. */
export function refundDutyApplies(pack: CasePack): boolean {
  return pack.intake.issues.some((i) => i.cause === "unauthorised_transaction");
}
