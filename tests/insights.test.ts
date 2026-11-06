import { describe, expect, it } from "vitest";
import { computeDeadlines } from "@/lib/deadlines";
import { byUrgency, findIncidentRefs, groupCases, incidentDate, median, percent, sharedIncidents } from "@/lib/insights";

describe("incident references", () => {
  it("finds each reference once, in order", () => {
    expect(findIncidentRefs("See INC-2026-1030-01. Also INC-2026-1030-01 and INC-2026-0912-03")).toEqual([
      "INC-2026-0912-03",
      "INC-2026-1030-01",
    ]);
    expect(findIncidentRefs("No incident here, CHG-88213 is a change not an incident")).toEqual([]);
  });
  it("reads the date from the reference", () => {
    expect(incidentDate("INC-2026-1030-01")).toBe("2026-10-30");
    expect(incidentDate("INC-2026-1340-01")).toBeNull(); // month 13 is not a date
    expect(incidentDate("INC-2026-0231-01")).toBeNull(); // 31 Feb is not a date
  });
  it("only reports incidents shared by two or more complaints", () => {
    const shared = sharedIncidents([
      { id: "HV-001", text: "INC-2026-1030-01 app down" },
      { id: "HV-002", text: "nothing" },
      { id: "HV-003", text: "INC-2026-1030-01 INC-2026-1030-01" },
      { id: "HV-004", text: "INC-2026-0101-02" },
    ]);
    expect(shared).toEqual([{ key: "INC-2026-1030-01", caseIds: ["HV-001", "HV-003"], date: "2026-10-30" }]);
  });
});

describe("grouping", () => {
  it("counts a case once per key and sorts by most cases, then by key", () => {
    const groups = groupCases([
      { id: "A", keys: ["fees", "fees", "outage"] },
      { id: "B", keys: ["outage"] },
      { id: "C", keys: ["delay"] },
    ]);
    expect(groups).toEqual([
      { key: "outage", caseIds: ["A", "B"] },
      { key: "delay", caseIds: ["C"] },
      { key: "fees", caseIds: ["A"] },
    ]);
  });
});

describe("urgency order", () => {
  it("puts overdue refund decisions first, then overdue, then due soon, then by date", () => {
    const today = "2026-11-09";
    const refund = computeDeadlines("2026-11-02", "15_business_days", today, { refundDuty: true });
    const overdue = computeDeadlines("2026-09-01", "8_weeks", today);
    const soon = computeDeadlines("2026-10-19", "15_business_days", today);
    const later = computeDeadlines("2026-11-02", "8_weeks", today);
    const sorted = [later, soon, overdue, refund].sort(byUrgency);
    expect(sorted).toEqual([refund, overdue, soon, later]);
  });
});

describe("number helpers", () => {
  it("rounds percentages and refuses to divide by zero", () => {
    expect(percent(2, 3)).toBe("67%");
    expect(percent(0, 0)).toBe("n/a");
  });
  it("takes the median of odd and even lists", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});
