import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'
import type { ProductSkuMapping } from './01-products.js'

export interface SkuMapping {
  oldSkuId: number
  newSkuId: number
  productId: number
}

export async function cloneSkus(
  source: VtexClient,
  target: VtexClient,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
): Promise<SkuMapping[]> {
  const step = 'skus'
  console.log('[step:skus] starting')

  // Discover SKUs per source product
  const skusByProduct: Array<{
    productId: number
    skus: Awaited<ReturnType<VtexClient['getSkusByProductId']>>
  }> = []
  let totalSkus = 0
  for (const { oldProductId } of productMappings) {
    try {
      const skus = await source.getSkusByProductId(oldProductId)
      skusByProduct.push({ productId: oldProductId, skus })
      totalSkus += skus.length
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[step:skus] could not fetch SKUs for product ${oldProductId}: ${message}`)
    }
  }

  emit({ type: 'step:start', step, total: totalSkus })

  let created = 0
  let errors = 0
  let current = 0
  const mappings: SkuMapping[] = []

  for (const { productId, skus } of skusByProduct) {
    for (const sku of skus) {
      current++
      try {
        const newSku = await target.createSku({
          Id: sku.Id,
          ProductId: productId,
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

        created++
        mappings.push({ oldSkuId: sku.Id, newSkuId: newSku.Id, productId })

        if (sku.IsActive) {
          try {
            await target.activateSku(newSku.Id)
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            console.warn(`[step:skus] could not activate SKU ${newSku.Id}: ${message}`)
          }
        }

        emit({
          type: 'step:progress',
          step,
          current,
          total: totalSkus,
          detail: `SKU ${sku.Id} → ${newSku.Id}`,
        })
      } catch (error) {
        errors++
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[step:skus] error cloning SKU ${sku.Id}: ${message}`)
        emit({
          type: 'step:error',
          step,
          message: `Failed to clone SKU ${sku.Id}`,
          detail: message,
        })
      }
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:skus] done: created=${created}, errors=${errors}`)
  return mappings
}
