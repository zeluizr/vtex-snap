import type { VtexClient } from '../../lib/vtex-client.js'
import type { DiscoveredCatalog, EmitFn } from '../types.js'
import type { ProductSkuMapping } from './01-products.js'

export interface SkuMapping {
  oldSkuId: number
  newSkuId: number
  productId: number
}

export async function cloneSkus(
  target: VtexClient,
  emit: EmitFn,
  catalog: DiscoveredCatalog,
  productMappings: ProductSkuMapping[],
): Promise<SkuMapping[]> {
  const step = 'skus'
  const productMap = new Map(productMappings.map((m) => [m.oldProductId, m.newProductId]))
  const totalSkus = productMappings.reduce(
    (sum, m) => sum + (catalog.get(m.oldProductId)?.skus.length ?? 0),
    0,
  )

  emit({ type: 'step:start', step, total: totalSkus })

  let created = 0
  let errors = 0
  let current = 0
  const mappings: SkuMapping[] = []

  for (const { oldProductId } of productMappings) {
    const newProductId = productMap.get(oldProductId)
    const entry = catalog.get(oldProductId)
    if (!entry || newProductId === undefined) continue

    for (const { oldSkuId, context } of entry.skus) {
      current++
      try {
        const { sku: newSku, mode } = await target.upsertSku({
          Id: context.Id,
          ProductId: newProductId,
          IsActive: false,
          Name: context.SkuName,
          RefId: context.AlternateIds?.RefId ?? '',
          PackagedHeight: context.Dimension?.height ?? 0,
          PackagedLength: context.Dimension?.length ?? 0,
          PackagedWidth: context.Dimension?.width ?? 0,
          PackagedWeightKg: context.Dimension?.weight ?? 0,
          Height: context.RealDimension?.realHeight ?? null,
          Length: context.RealDimension?.realLength ?? null,
          Width: context.RealDimension?.realWidth ?? null,
          WeightKg: context.RealDimension?.realWeight ?? null,
          CubicWeight: context.Dimension?.cubicweight ?? 0,
          IsKit: context.IsKit ?? false,
          RewardValue: context.RewardValue,
          EstimatedDateArrival: context.EstimatedDateArrival,
          ManufacturerCode: context.ManufacturerCode ?? '',
          CommercialConditionId: context.CommercialConditionId ?? 1,
          MeasurementUnit: context.MeasurementUnit ?? 'un',
          UnitMultiplier: context.UnitMultiplier ?? 1,
          ModalType: context.ModalType ?? '',
          KitItensSellApart: false,
          Videos: context.Videos ?? [],
          ActivateIfPossible: false,
        })

        created++
        mappings.push({ oldSkuId, newSkuId: newSku.Id, productId: newProductId })

        if (context.IsActive) {
          try {
            await target.activateSku(newSku.Id)
          } catch {
            // Activation is best-effort — destination may forbid it for items without stock.
          }
        }

        emit({
          type: 'step:progress',
          step,
          current,
          total: totalSkus,
          detail: `${mode} SKU ${oldSkuId} → ${newSku.Id}`,
        })
      } catch (error) {
        errors++
        const message = error instanceof Error ? error.message : String(error)
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
  return mappings
}
