import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'
import type { ProductSkuMapping } from './05-products.js'

export async function clonePrices(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
): Promise<void> {
  const step = 'prices'
  console.log('[step:prices] starting')

  const allSkuIds: number[] = []
  for (const { skuIds } of productMappings) {
    for (const oldSkuId of skuIds) {
      if (idMap.get('sku', oldSkuId) !== undefined) {
        allSkuIds.push(oldSkuId)
      }
    }
  }

  emit({ type: 'step:start', step, total: allSkuIds.length })

  let created = 0
  let errors = 0

  for (let i = 0; i < allSkuIds.length; i++) {
    const oldSkuId = allSkuIds[i]!
    const newSkuId = idMap.getOrThrow('sku', oldSkuId)

    try {
      const price = await source.getPrice(oldSkuId)
      if (price !== null) {
        await target.setPrice(newSkuId, {
          listPrice: price.listPrice,
          costPrice: price.costPrice,
          markup: price.markup,
          basePrice: price.basePrice,
          fixedPrices: price.fixedPrices ?? [],
        })
        created++
      }

      emit({
        type: 'step:progress',
        step,
        current: i + 1,
        total: allSkuIds.length,
        detail: `SKU ${oldSkuId} → ${newSkuId}`,
      })
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[step:prices] error cloning price for SKU ${oldSkuId}: ${message}`)
      emit({
        type: 'step:error',
        step,
        message: `Failed to clone price for SKU ${oldSkuId}`,
        detail: message,
      })
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:prices] done: created=${created}, errors=${errors}`)
}
