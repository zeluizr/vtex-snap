import type { VtexClient } from '../lib/vtex-client.js'
import type { DiscoveredCatalog, DiscoveredProduct, EmitFn } from './types.js'

const PAGE_SIZE = 1000

export async function discoverCatalog(
  source: VtexClient,
  emit: EmitFn,
): Promise<DiscoveredCatalog> {
  const step = 'discovery'

  const skuIds: number[] = []
  let page = 1
  while (true) {
    const ids = await source.getSkuIds(page, PAGE_SIZE)
    if (ids.length === 0) break
    skuIds.push(...ids)
    if (ids.length < PAGE_SIZE) break
    page++
  }

  emit({ type: 'step:start', step, total: skuIds.length })

  const catalog: DiscoveredCatalog = new Map()
  let scanned = 0
  let skipped = 0

  for (const skuId of skuIds) {
    scanned++
    const context = await source.getSkuContextSafe(skuId)
    if (!context) {
      skipped++
      emit({
        type: 'step:progress',
        step,
        current: scanned,
        total: skuIds.length,
        detail: `sku ${skuId} (não encontrado)`,
      })
      continue
    }

    let entry: DiscoveredProduct | undefined = catalog.get(context.ProductId)
    if (!entry) {
      entry = {
        oldProductId: context.ProductId,
        brandName: context.BrandName,
        productSpecs: context.ProductSpecifications ?? [],
        skus: [],
      }
      catalog.set(context.ProductId, entry)
    }
    entry.skus.push({ oldSkuId: skuId, context })

    emit({
      type: 'step:progress',
      step,
      current: scanned,
      total: skuIds.length,
      detail: `sku ${skuId} → product ${context.ProductId}`,
    })
  }

  emit({
    type: 'step:complete',
    step,
    created: catalog.size,
    errors: skipped,
  })
  return catalog
}
