import { cn, scoreColor, scoreBg } from "@/lib/utils";

describe("Utility functions", () => {
  it("merges class names with cn", () => {
    expect(cn("px-2", false && "hidden", "text-sm")).toBe("px-2 text-sm");
  });

  it("maps posture scores to color classes", () => {
    expect(scoreColor(90)).toBe("text-emerald-500");
    expect(scoreColor(70)).toBe("text-amber-500");
    expect(scoreColor(40)).toBe("text-red-500");
    expect(scoreBg(90)).toBe("bg-emerald-500");
    expect(scoreBg(70)).toBe("bg-amber-500");
    expect(scoreBg(40)).toBe("bg-red-500");
  });
});
