import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'

export interface CliConfig {
  source: {
    accountName: string
    appKey: string
    appToken: string
    sellerId: string
  }
  target: {
    accountName: string
    appKey: string
    appToken: string
    sellerId: string
  }
}

export function getConfigPath(): string {
  return join(homedir(), '.config', 'vtex-snap', 'config.json')
}

export function getCategoriesFilePath(): string {
  return join(homedir(), '.config', 'vtex-snap', 'categories.txt')
}

export async function loadCategoryIds(): Promise<number[] | null> {
  try {
    const content = await readFile(getCategoriesFilePath(), 'utf-8')
    const ids: number[] = []
    for (const rawLine of content.split('\n')) {
      const line = rawLine.trim()
      if (!line) continue
      const id = parseInt(line, 10)
      if (Number.isFinite(id) && id > 0) ids.push(id)
    }
    return ids.length > 0 ? Array.from(new Set(ids)) : null
  } catch {
    return null
  }
}

export async function loadConfig(): Promise<CliConfig | null> {
  try {
    const content = await readFile(getConfigPath(), 'utf-8')
    return JSON.parse(content) as CliConfig
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
