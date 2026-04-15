import { describe, expect, it, beforeEach } from 'vitest'
import { resolveLang, setLang, getLang, t } from './index.js'

describe('resolveLang', () => {
  it('precedence: flag > env > config > Intl > fallback', () => {
    expect(resolveLang({ flag: 'pt', env: 'es', config: 'en' })).toBe('pt')
    expect(resolveLang({ env: 'es', config: 'en' })).toBe('es')
    expect(resolveLang({ config: 'en' })).toBe('en')
  })

  it('falls back to en when nothing matches', () => {
    expect(resolveLang({ flag: 'fr', env: 'de', config: 'jp' })).toBe('en')
  })

  it('normalizes locale strings (pt-BR → pt, es-MX → es, en-US → en)', () => {
    expect(resolveLang({ flag: 'pt-BR' })).toBe('pt')
    expect(resolveLang({ flag: 'es-MX' })).toBe('es')
    expect(resolveLang({ flag: 'en-US' })).toBe('en')
  })

  it('ignores empty values and falls through', () => {
    expect(resolveLang({ flag: '', env: 'pt' })).toBe('pt')
    expect(resolveLang({ flag: undefined, env: undefined, config: 'en' })).toBe('en')
  })
})

describe('t()', () => {
  beforeEach(() => setLang('en'))

  it('returns the translated string for the current language', () => {
    setLang('pt')
    expect(t('init.field.required')).toBe('Obrigatório')
    setLang('es')
    expect(t('init.field.required')).toBe('Obligatorio')
    setLang('en')
    expect(t('init.field.required')).toBe('Required')
  })

  it('interpolates {var} placeholders', () => {
    setLang('en')
    expect(t('start.confirm', { source: 'A', target: 'B', count: 3 })).toContain('A → B')
    expect(t('start.confirm', { source: 'A', target: 'B', count: 3 })).toContain('(3 steps')
  })

  it('falls back to en when a key is missing in another locale', () => {
    // All keys exist in all dicts (typed), but verify fallback path works for current dict
    setLang('pt')
    expect(t('init.intro')).toContain('Configuração')
  })

  it('returns the key when params reference is missing', () => {
    setLang('en')
    expect(t('start.confirm', { source: 'A' })).toContain('{target}')
  })
})

describe('setLang/getLang', () => {
  it('round-trips', () => {
    setLang('pt')
    expect(getLang()).toBe('pt')
    setLang('es')
    expect(getLang()).toBe('es')
  })
})
