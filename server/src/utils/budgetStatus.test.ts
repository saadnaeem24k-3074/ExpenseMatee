import { describe, it, expect } from "vitest";
import { computeBudgetStatus } from "./budgetStatus.js";

describe("computeBudgetStatus", () => {
  it("is 'ok' when spend is well under budget", () => {
    expect(computeBudgetStatus(10000, 5000)).toEqual({ percent: 50, status: "ok" });
  });

  it("is 'ok' at exactly 79%", () => {
    expect(computeBudgetStatus(100, 79)).toEqual({ percent: 79, status: "ok" });
  });

  it("switches to 'warning' at exactly the 80% threshold", () => {
    expect(computeBudgetStatus(100, 80)).toEqual({ percent: 80, status: "warning" });
  });

  it("is 'warning' just under 100%", () => {
    expect(computeBudgetStatus(100, 99)).toEqual({ percent: 99, status: "warning" });
  });

  it("switches to 'exceeded' at exactly 100%", () => {
    expect(computeBudgetStatus(100, 100)).toEqual({ percent: 100, status: "exceeded" });
  });

  it("stays 'exceeded' when spend is far over budget", () => {
    expect(computeBudgetStatus(100, 250)).toEqual({ percent: 250, status: "exceeded" });
  });

  it("treats a zero-amount budget as 0% rather than dividing by zero", () => {
    expect(computeBudgetStatus(0, 50)).toEqual({ percent: 0, status: "ok" });
  });

  it("rounds to the nearest whole percent", () => {
    // 33.33... -> 33
    expect(computeBudgetStatus(300, 100)).toEqual({ percent: 33, status: "ok" });
  });
});
