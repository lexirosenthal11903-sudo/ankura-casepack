/** Date formatting for display. Works on YYYY-MM-DD strings in UTC so server and browser agree. */
export function formatDate(iso: string, withDay = false): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", {
    ...(withDay ? { weekday: "short" as const } : {}),
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).replace(",", "");
}

const MODEL_NAMES: Record<string, string> = {
  "claude-haiku-5-5": "Claude Haiku 5.5",
  "claude-sonnet-5-5": "Claude Sonnet 5.5",
};

export function modelName(id: string): string {
  return MODEL_NAMES[id] ?? id;
}

export function deadlineTag(status: string, businessDaysLeft: number, calendarDaysLeft: number): string {
  if (status === "overdue") return `${-calendarDaysLeft} day${calendarDaysLeft === -1 ? "" : "s"} overdue`;
  if (calendarDaysLeft === 0) return "Due today";
  return `${businessDaysLeft} business day${businessDaysLeft === 1 ? "" : "s"} left`;
}
