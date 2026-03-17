import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'
import type { ProductSkuMapping } from './05-products.js'

export async function cloneSkus(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
): Promise<void> {
  const step = 'skus'
  console.log('[step:skus] starting')

  const totalSkus = productMappings.reduce((sum, m) => sum + m.skuIds.length, 0)
  emit({ type: 'step:start', step, total: totalSkus })

  let created = 0
  let errors = 0
  let current = 0

  for (const { newProductId, skuIds } of productMappings) {
    for (const oldSkuId of skuIds) {
      current++
      try {
        const sku = await source.getSku(oldSkuId)

        const newSku = await target.createSku({
          ProductId: newProductId,
          IsActive: false,
          Name: sku.Name,
          RefId: sku.RefId ?? '',
          PackagedHeight: sku.PackagedHeight ?? 0,
          PackagedLength: sku.PackagedLength ?? 0,
          PackagedWidth: sku.PackagedWidth ?? 0,
          PackagedWeightKg: sku.PackagedWeightKg ?? 0,
          Height: sku.Height,
          Length: sku.Length,
          Width: sku.Width,
          WeightKg: sku.WeightKg,
          CubicWeight: sku.CubicWeight ?? 0,
          IsKit: sku.IsKit ?? false,
          RewardValue: sku.RewardValue,
          EstimatedDateArrival: sku.EstimatedDateArrival,
          ManufacturerCode: sku.ManufacturerCode ?? '',
          CommercialConditionId: sku.CommercialConditionId ?? 1,
          MeasurementUnit: sku.MeasurementUnit ?? 'un',
          UnitMultiplier: sku.UnitMultiplier ?? 1,
          ModalType: sku.ModalType ?? '',
          KitItensSellApart: sku.KitItensSellApart ?? false,
          Videos: sku.Videos ?? [],
          ActivateIfPossible: false,
        })

        idMap.set('sku', oldSkuId, newSku.Id)
        created++

        emit({
          type: 'step:progress',
          step,
          current,
          total: totalSkus,
          detail: `SKU ${oldSkuId} → ${newSku.Id}`,
        })
      } catch (error) {
        errors++
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[step:skus] error cloning SKU ${oldSkuId}: ${message}`)
        emit({
          type: 'step:error',
          step,
          message: `Failed to clone SKU ${oldSkuId}`,
          detail: message,
        })
      }
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:skus] done: created=${created}, errors=${errors}`)
}
