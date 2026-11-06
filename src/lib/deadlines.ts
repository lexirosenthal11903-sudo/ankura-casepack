/**
 * Complaint deadlines under FCA DISP, calculated by plain code (never by the AI).
 *
 * - Summary resolution and acknowledgement: close of the 3rd business day after receipt (DISP 1.5.1R, policy CP-2.1, CP-2.2).
 * - Standard final response: 8 weeks after receipt (DISP 1.6.2R, CP-3.1).
 * - Payment services (Parts 6-7 PSRs): end of 15 business days after receipt, or 35 in exceptional cases
 *   with a holding reply (DISP 1.6.2AR, CP-3.2).
 * - "confirm": the handler must decide which clock applies. Until then the shorter one is used (CP-3.3).
 * - Ombudsman referral: 6 months from the date of the final response (DISP 2.8.2R, CP-3.4).
 *
 * Dates are ISO strings (YYYY-MM-DD) handled in UTC so time zones and clock changes cannot shift them.
 */

// England and Wales bank holidays, from https://www.gov.uk/bank-holidays.json (fetched 5 Nov 2026).
export const BANK_HOLIDAYS = new Set([
  "2026-01-01", "2026-04-03", "2026-04-06", "2026-05-04", "2026-05-25", "2026-08-31", "2026-12-25", "2026-12-28",
  "2027-01-01", "2027-03-26", "2027-03-29", "2027-05-03", "2027-05-31", "2027-08-30", "2027-12-27", "2027-12-28",
]);

export type Clock = "8_weeks" | "15_business_days" | "confirm";

const DAY_MS = 86_400_000;

function toDate(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) throw new Error(`Expected YYYY-MM-DD, got "${iso}"`);
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso) throw new Error(`Invalid date "${iso}"`);
  return d;
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(iso: string, days: number): string {
  return toIso(new Date(toDate(iso).getTime() + days * DAY_MS));
}

export function isBusinessDay(iso: string): boolean {
  const dow = toDate(iso).getUTCDay();
  return dow !== 0 && dow !== 6 && !BANK_HOLIDAYS.has(iso);
}

/** The date that is `n` business days after `iso` (the day itself is not counted). */
export function addBusinessDays(iso: string, n: number): string {
  let d = iso;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) left--;
  }
  return d;
}

/** Business days after `from` up to and including `to`. Negative when `to` is earlier than `from`. */
export function businessDaysBetween(from: string, to: string): number {
  if (to < from) return -businessDaysBetween(to, from);
  let d = from;
  let count = 0;
  while (d < to) {
    d = addDays(d, 1);
    if (isBusinessDay(d)) count++;
  }
  return count;
}

/** Same day of the month, `months` later. Clamped to the month's last day (31 Aug + 6 months = 28 Feb). */
export function addMonths(iso: string, months: number): string {
  const d = toDate(iso);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return toIso(target);
}

export type DeadlineStatus = "on_track" | "due_soon" | "overdue";

export interface Deadlines {
  received: string;
  clock: Clock;
  /** Close of this day is the last chance for a summary resolution, and the acknowledgement deadline. */
  summaryResolutionWindowCloses: string;
  /** 8-week date. Always shown, because it is the fallback for non-payment-services issues. */
  eightWeekDue: string;
  /** 15 and 35 business day dates. Shown when the clock is 15_business_days or confirm. */
  psrDue?: string;
  psrExceptionalDue?: string;
  /** The date the handler works to. For "confirm" this is the shorter clock until a person decides. */
  workingDue: string;
  needsHandlerConfirmation: boolean;
  /**
   * Refund decision for an unauthorised payment: end of the next business day (PSRs reg 76, policy CP-7.1).
   * Counted from the date the complaint was received, which is the latest the bank can have known.
   */
  refundDue?: string;
  refundOverdue?: boolean;
  calendarDaysLeft: number;
  businessDaysLeft: number;
  status: DeadlineStatus;
}

export function computeDeadlines(received: string, clock: Clock, asOf: string, opts: { refundDuty?: boolean } = {}): Deadlines {
  toDate(received);
  toDate(asOf);
  const eightWeekDue = addDays(received, 56);
  const usesPsr = clock !== "8_weeks";
  const psrDue = usesPsr ? addBusinessDays(received, 15) : undefined;
  const psrExceptionalDue = usesPsr ? addBusinessDays(received, 35) : undefined;
  const workingDue = psrDue && psrDue < eightWeekDue ? psrDue : eightWeekDue;
  const calendarDaysLeft = Math.round((toDate(workingDue).getTime() - toDate(asOf).getTime()) / DAY_MS);
  const businessDaysLeft = businessDaysBetween(asOf, workingDue);
  const refundDue = opts.refundDuty ? addBusinessDays(received, 1) : undefined;
  const refundOverdue = refundDue ? refundDue < asOf : undefined;
  const status: DeadlineStatus = calendarDaysLeft < 0 || refundOverdue ? "overdue" : businessDaysLeft <= 5 ? "due_soon" : "on_track";

  return {
    received,
    clock,
    summaryResolutionWindowCloses: addBusinessDays(received, 3),
    eightWeekDue,
    psrDue,
    psrExceptionalDue,
    workingDue,
    needsHandlerConfirmation: clock === "confirm",
    refundDue,
    refundOverdue,
    calendarDaysLeft,
    businessDaysLeft,
    status,
  };
}

/** Last day to refer to the Financial Ombudsman Service: 6 months after the final response. */
export function ombudsmanReferralDeadline(finalResponseDate: string): string {
  return addMonths(finalResponseDate, 6);
}
