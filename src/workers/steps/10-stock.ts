import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'
import type { ProductSkuMapping } from './05-products.js'

export async function cloneStock(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
): Promise<void> {
  const step = 'stock'
  console.log('[step:stock] starting')

  const allSkuIds: number[] = []
  for (const { skuIds } of productMappings) {
    for (const oldSkuId of skuIds) {
      if (idMap.get('sku', oldSkuId) !== undefined) {
        allSkuIds.push(oldSkuId)
      }
    }
  }

  let targetWarehouses: Awaited<ReturnType<VtexClient['getWarehouses']>> = []
  let sourceWarehouses: Awaited<ReturnType<VtexClient['getWarehouses']>> = []

  try {
    targetWarehouses = await target.getWarehouses()
    sourceWarehouses = await source.getWarehouses()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[step:stock] could not fetch warehouses: ${message}`)
  }

  emit({ type: 'step:start', step, total: allSkuIds.length })

  let created = 0
  let errors = 0

  for (let i = 0; i < allSkuIds.length; i++) {
    const oldSkuId = allSkuIds[i]!
    const newSkuId = idMap.getOrThrow('sku', oldSkuId)

    // Copy inventory from matching warehouses
    for (const sourceWarehouse of sourceWarehouses) {
      const targetWarehouse = targetWarehouses.find((w) => w.name === sourceWarehouse.name)
      if (!targetWarehouse) continue

      try {
        const inventory = await source.getInventory(oldSkuId, sourceWarehouse.id)
        await target.updateInventory(newSkuId, targetWarehouse.id, {
          unlimitedQuantity: inventory.hasUnlimitedQuantity,
          quantity: inventory.totalQuantity - inventory.reservedQuantity,
        })
        created++
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(
          `[step:stock] could not sync inventory for SKU ${oldSkuId} warehouse ${sourceWarehouse.id}: ${message}`,
        )
      }
    }

    // Activate SKU after stock and price have been set
    try {
      await target.activateSku(newSkuId)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[step:stock] could not activate SKU ${newSkuId}: ${message}`)
    }

    emit({
      type: 'step:progress',
      step,
      current: i + 1,
      total: allSkuIds.length,
      detail: `SKU ${oldSkuId} → ${newSkuId} (activated)`,
    })
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:stock] done: created=${created}, errors=${errors}`)
}
