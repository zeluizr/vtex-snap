import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'

export async function cloneTradePolicies(
  source: VtexClient,
  target: VtexClient,
  _idMap: IdMap,
  emit: EmitFn,
): Promise<void> {
  const step = 'trade-policies'
  console.log('[step:trade-policies] fetching trade policies')

  const sourcePolicies = await source.getTradePolicies()
  let targetPolicies: typeof sourcePolicies = []

  try {
    targetPolicies = await target.getTradePolicies()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[step:trade-policies] could not fetch target policies: ${message}`)
  }

  emit({ type: 'step:start', step, total: sourcePolicies.length })

  const targetPolicyNames = new Set(targetPolicies.map((p) => p.Name))
  const missing: string[] = []
  let matched = 0

  for (let i = 0; i < sourcePolicies.length; i++) {
    const policy = sourcePolicies[i]!
    if (targetPolicyNames.has(policy.Name)) {
      matched++
      emit({
        type: 'step:progress',
        step,
        current: i + 1,
        total: sourcePolicies.length,
        detail: `Matched: ${policy.Name}`,
      })
    } else {
      missing.push(policy.Name)
      emit({
        type: 'step:error',
        step,
        message: `Trade policy "${policy.Name}" not found in target — must be created manually`,
      })
    }
  }

  emit({ type: 'step:complete', step, created: matched, errors: missing.length })
  if (missing.length > 0) {
    console.warn(
      `[step:trade-policies] missing policies in target: ${missing.join(', ')}`,
    )
  }
  console.log(`[step:trade-policies] done: matched=${matched}, missing=${missing.length}`)
}
