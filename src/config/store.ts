import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { SupportedLang } from '../i18n/index.js'

export interface Profile {
  accountName: string
  appKey: string
  appToken: string
  sellerId: string
}

export interface CliConfig {
  lang?: SupportedLang
  profiles: Profile[]
}

export function getConfigPath(): string {
  return join(homedir(), '.config', 'vtex-snap', 'config.json')
}

export async function loadConfig(): Promise<CliConfig | null> {
  try {
    const content = await readFile(getConfigPath(), 'utf-8')
    const parsed = JSON.parse(content) as Partial<CliConfig>
    return {
      lang: parsed.lang,
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles : [],
    }
  } catch {
    return null
  }
}

export async function saveConfig(config: CliConfig): Promise<void> {
  const configPath = getConfigPath()
  const configDir = join(homedir(), '.config', 'vtex-snap')
  await mkdir(configDir, { recursive: true })
  await writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function addProfile(profile: Profile): Promise<CliConfig> {
  const current: CliConfig = (await loadConfig()) ?? { profiles: [] }
  const others = current.profiles.filter((p) => p.accountName !== profile.accountName)
  const next: CliConfig = { ...current, profiles: [...others, profile] }
  await saveConfig(next)
  return next
}

export async function setLangPref(lang: SupportedLang): Promise<void> {
  const current: CliConfig = (await loadConfig()) ?? { profiles: [] }
  await saveConfig({ ...current, lang })
}
