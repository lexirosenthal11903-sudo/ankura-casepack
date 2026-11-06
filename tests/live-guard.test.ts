import { describe, expect, it } from "vitest";
import { checkLiveAllowed } from "@/lib/live-guard";

describe("live mode rate limit", () => {
  it("allows 3 runs a minute per visitor, then refuses", () => {
    const t = Date.UTC(2026, 10, 9, 12);
    expect(checkLiveAllowed("1.1.1.1", t).ok).toBe(true);
    expect(checkLiveAllowed("1.1.1.1", t + 1).ok).toBe(true);
    expect(checkLiveAllowed("1.1.1.1", t + 2).ok).toBe(true);
    expect(checkLiveAllowed("1.1.1.1", t + 3).ok).toBe(false);
    expect(checkLiveAllowed("2.2.2.2", t + 4).ok).toBe(true);
    expect(checkLiveAllowed("1.1.1.1", t + 61_000).ok).toBe(true);
  });
});
