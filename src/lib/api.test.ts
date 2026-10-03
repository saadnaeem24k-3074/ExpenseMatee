import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { api, ApiError } from "./api"

// Fake fetch Response: only the parts api.ts uses.
const fakeResponse = (status: number, body: unknown = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: () => Promise.resolve(body),
})

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe("api client", () => {
  it("login POSTs the credentials as JSON with the session cookie", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { user: { id: "1" } }))
    await api.auth.login("a@b.com", "secret123")

    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/auth\/login$/)
    expect(options.method).toBe("POST")
    expect(options.credentials).toBe("include")
    expect(JSON.parse(options.body)).toEqual({ email: "a@b.com", password: "secret123" })
  })

  it("throws an ApiError carrying the server's message and status", async () => {
    fetchMock.mockResolvedValue(fakeResponse(401, { error: "Invalid email or password." }))
    const err = await api.auth.login("a@b.com", "wrong").catch((e) => e)

    expect(err).toBeInstanceOf(ApiError)
    expect(err.message).toBe("Invalid email or password.")
    expect(err.status).toBe(401)
  })

  it("returns undefined for a 204 No Content response", async () => {
    fetchMock.mockResolvedValue(fakeResponse(204))
    await expect(api.auth.logout()).resolves.toBeUndefined()
  })
})
