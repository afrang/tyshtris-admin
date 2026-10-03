import { useCallback, useEffect, useMemo, useState } from 'react'
import { listLanguages, type Language, type TextDirection } from '../lib/languagesApi'

export type UseLanguagesResult = {
  languages: Language[]
  lang: string
  setLang: (prefix: string) => void
  direction: TextDirection
  activeLanguage: Language | null
  loading: boolean
  error: string | null
  hasLanguages: boolean
  refresh: () => Promise<void>
}

function pickInitialPrefix(items: Language[], preferred?: string): string {
  if (preferred && items.some((l) => l.prefix === preferred)) return preferred
  const defaultLang = items.find((l) => l.isDefault)
  return defaultLang?.prefix ?? items[0]?.prefix ?? ''
}

export function useLanguages(initialPrefix?: string): UseLanguagesResult {
  const [languages, setLanguages] = useState<Language[]>([])
  const [lang, setLangState] = useState(initialPrefix ?? '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const items = await listLanguages()
      setLanguages(items)
      setLangState((current) => pickInitialPrefix(items, current || initialPrefix))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load languages.')
      setLanguages([])
    } finally {
      setLoading(false)
    }
  }, [initialPrefix])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setLang = useCallback(
    (prefix: string) => {
      if (languages.some((l) => l.prefix === prefix)) {
        setLangState(prefix)
      }
    },
    [languages],
  )

  const activeLanguage = useMemo(
    () => languages.find((l) => l.prefix === lang) ?? null,
    [languages, lang],
  )

  const direction: TextDirection = activeLanguage?.direction ?? 'ltr'

  return {
    languages,
    lang,
    setLang,
    direction,
    activeLanguage,
    loading,
    error,
    hasLanguages: languages.length > 0,
    refresh,
  }
}
