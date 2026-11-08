import { useEffect, useState } from "react"
import { api, type Currency } from "./api"

export function useCurrencies(): Currency[] {
  const [currencies, setCurrencies] = useState<Currency[]>([])

  useEffect(() => {
    api.currencies.list()
      .then(({ currencies }) => setCurrencies(currencies))
      .catch(() => setCurrencies([]))
  }, [])

  return currencies
}
