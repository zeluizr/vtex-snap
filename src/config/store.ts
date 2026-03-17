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
