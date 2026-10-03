import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import MonthlyCategory from "./MonthlyCategory"

describe("MonthlyCategory (category pie card)", () => {
  it("does not crash for a month with no transactions (blank-page regression)", () => {
    // Used to throw on chartData[0].browser, which blanked the whole Report page.
    const render = () => renderToStaticMarkup(<MonthlyCategory chartConfig={{}} chartData={[]} />)
    expect(render).not.toThrow()
    expect(render()).toContain("No transactions for this month yet.")
  })

  it("names the biggest category and its share of the month", () => {
    const html = renderToStaticMarkup(
      <MonthlyCategory
        chartConfig={{}}
        chartData={[
          { browser: "utilities", visitors: 2500, fill: "#111" },
          { browser: "shopping", visitors: 7500, fill: "#222" },
        ]}
      />
    )
    expect(html).toContain("shopping")
    expect(html).toContain("75.0%")
  })
})
