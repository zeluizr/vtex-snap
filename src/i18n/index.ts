import { en, type MessageKey } from './locales/en.js'
import { es } from './locales/es.js'
import { pt } from './locales/pt.js'

export type SupportedLang = 'pt' | 'es' | 'en'

const DICTIONARIES: Record<SupportedLang, Record<MessageKey, string>> = {
  en,
  es,
  pt,
}

let currentLang: SupportedLang = 'en'

function normalize(value: string | undefined): SupportedLang | undefined {
  if (!value) return undefined
  const head = value.toLowerCase().slice(0, 2)
  if (head === 'pt' || head === 'es' || head === 'en') return head
  return undefined
}

export interface ResolveLangInput {
  flag?: string
  env?: string
  config?: string
}

export function resolveLang({ flag, env, config }: ResolveLangInput = {}): SupportedLang {
  const fromIntl = (() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().locale
    } catch {
      return undefined
    }
  })()

  return (
    normalize(flag) ??
    normalize(env) ??
    normalize(config) ??
    normalize(fromIntl) ??
    'en'
  )
}

export function setLang(lang: SupportedLang): void {
  currentLang = lang
}

export function getLang(): SupportedLang {
  return currentLang
}

export function t(
  key: MessageKey,
  params?: Record<string, string | number | undefined>,
): string {
  const dict = DICTIONARIES[currentLang]
  const template = dict[key] ?? en[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name]
    return v === undefined ? `{${name}}` : String(v)
  })
}

export type { MessageKey }
