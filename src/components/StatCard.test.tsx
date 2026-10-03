import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import { StatCard } from "./StatCard"

const icon = <span data-testid="icon">i</span>

describe("StatCard", () => {
  it("shows the label, icon and amount with its currency symbol", () => {
    const html = renderToStaticMarkup(<StatCard label="Income" amount={12345} icon={icon} tone="sage" currencySymbol="Rs" />)
    expect(html).toContain("Income")
    expect(html).toContain('data-testid="icon"')
    expect(html).toContain(`Rs${(12345).toLocaleString()}`)
  })

  it("uses a different colour for income (sage) and expense (clay)", () => {
    const sage = renderToStaticMarkup(<StatCard label="a" amount={1} icon={icon} tone="sage" />)
    const clay = renderToStaticMarkup(<StatCard label="a" amount={1} icon={icon} tone="clay" />)
    expect(sage).toContain("text-sage")
    expect(clay).toContain("text-clay")
  })
})
