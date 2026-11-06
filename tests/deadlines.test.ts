import { describe, expect, it } from "vitest";
import {
  addBusinessDays, addMonths, businessDaysBetween, computeDeadlines, isBusinessDay, ombudsmanReferralDeadline,
} from "@/lib/deadlines";

// Every expected date below was counted by hand on a calendar.
describe("business days", () => {
  it("skips weekends", () => {
    expect(isBusinessDay("2026-10-31")).toBe(false); // Saturday
    expect(addBusinessDays("2026-10-30", 1)).toBe("2026-11-02"); // Fri -> Mon
  });
  it("skips England and Wales bank holidays", () => {
    expect(addBusinessDays("2026-08-28", 1)).toBe("2026-09-01"); // 31 Aug is a bank holiday
    expect(addBusinessDays("2026-12-18", 5)).toBe("2026-12-29"); // 25 and 28 Dec are holidays
  });
  it("counts between dates both ways", () => {
    expect(businessDaysBetween("2026-11-02", "2026-11-09")).toBe(5);
    expect(businessDaysBetween("2026-11-09", "2026-11-02")).toBe(-5);
    expect(businessDaysBetween("2026-11-02", "2026-11-02")).toBe(0);
  });
});

describe("computeDeadlines", () => {
  it("standard complaint: 3 business day window and 8 weeks", () => {
    const d = computeDeadlines("2026-10-26", "8_weeks", "2026-11-09");
    expect(d.summaryResolutionWindowCloses).toBe("2026-10-29");
    expect(d.eightWeekDue).toBe("2026-12-21");
    expect(d.workingDue).toBe("2026-12-21");
    expect(d.psrDue).toBeUndefined();
    expect(d.needsHandlerConfirmation).toBe(false);
    expect(d.status).toBe("on_track");
  });

  it("payment services complaint: 15 and 35 business days", () => {
    const d = computeDeadlines("2026-11-02", "15_business_days", "2026-11-09");
    expect(d.psrDue).toBe("2026-11-23");
    expect(d.psrExceptionalDue).toBe("2026-12-21");
    expect(d.workingDue).toBe("2026-11-23");
    expect(d.businessDaysLeft).toBe(10);
  });

  it("unclear complaint uses the shorter clock and asks the handler", () => {
    const d = computeDeadlines("2026-11-02", "confirm", "2026-11-09");
    expect(d.workingDue).toBe("2026-11-23");
    expect(d.eightWeekDue).toBe("2026-12-28");
    expect(d.needsHandlerConfirmation).toBe(true);
  });

  it("flags due soon and overdue", () => {
    expect(computeDeadlines("2026-11-02", "15_business_days", "2026-11-17").status).toBe("due_soon");
    const late = computeDeadlines("2026-09-07", "8_weeks", "2026-11-09");
    expect(late.status).toBe("overdue");
    expect(late.calendarDaysLeft).toBe(-7);
  });

  it("8 weeks over Christmas does not skip holidays (it is calendar time)", () => {
    expect(computeDeadlines("2026-11-02", "8_weeks", "2026-11-02").eightWeekDue).toBe("2026-12-28");
  });

  it("rejects bad dates", () => {
    expect(() => computeDeadlines("2026-02-30", "8_weeks", "2026-11-09")).toThrow();
    expect(() => computeDeadlines("05/11/2026", "8_weeks", "2026-11-09")).toThrow();
  });
});

describe("unauthorised payment refund duty (CP-7.1)", () => {
  it("is due by the end of the next business day and flags when passed", () => {
    const d = computeDeadlines("2026-11-02", "15_business_days", "2026-11-09", { refundDuty: true });
    expect(d.refundDue).toBe("2026-11-03");
    expect(d.refundOverdue).toBe(true);
    expect(d.status).toBe("overdue");
  });
  it("skips the weekend", () => {
    expect(computeDeadlines("2026-11-06", "15_business_days", "2026-11-06", { refundDuty: true }).refundDue).toBe("2026-11-09");
  });
  it("does not apply unless asked", () => {
    expect(computeDeadlines("2026-11-02", "15_business_days", "2026-11-09").refundDue).toBeUndefined();
  });
});

describe("Ombudsman referral window", () => {
  it("is 6 months from the final response, clamped at month end", () => {
    expect(ombudsmanReferralDeadline("2026-11-20")).toBe("2027-05-20");
    expect(addMonths("2026-08-31", 6)).toBe("2027-02-28");
  });
});
