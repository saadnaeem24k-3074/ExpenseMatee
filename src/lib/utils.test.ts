import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn (class name helper)", () => {
  it("drops falsy values and lets the later Tailwind class win a conflict", () => {
    expect(cn("p-2", false, null, "p-4")).toBe("p-4")
  })
})
