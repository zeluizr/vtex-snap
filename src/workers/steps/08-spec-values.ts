import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'
import type { ProductSkuMapping } from './05-products.js'

export async function cloneSpecValues(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
): Promise<void> {
  const step = 'spec-values'
  console.log('[step:spec-values] starting')

  const totalItems = productMappings.length + productMappings.reduce((s, m) => s + m.skuIds.length, 0)
  emit({ type: 'step:start', step, total: totalItems })

  let created = 0
  let errors = 0
  let current = 0

  for (const { oldProductId, skuIds } of productMappings) {
    const newProductId = idMap.get('product', oldProductId)
    if (!newProductId) continue

    current++

    // Product specs
    try {
      const specs = await source.getProductSpecifications(oldProductId)
      for (const spec of specs) {
        try {
          const newFieldId = idMap.get('specField', spec.Id)
          if (newFieldId === undefined) continue

          await target.setProductSpecification(newProductId, {
            Id: newFieldId,
            Value: spec.Value,
          })
          created++
        } catch (error) {
          errors++
          const message = error instanceof Error ? error.message : String(error)
          console.error(
            `[step:spec-values] error setting product spec ${spec.Id} for product ${oldProductId}: ${message}`,
          )
        }
      }

      emit({
        type: 'step:progress',
        step,
        current,
        total: totalItems,
        detail: `Product ${oldProductId}: ${specs.length} specs`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[step:spec-values] could not fetch specs for product ${oldProductId}: ${message}`)
    }

    // SKU specs
    for (const oldSkuId of skuIds) {
      const newSkuId = idMap.get('sku', oldSkuId)
      if (!newSkuId) continue

      current++

      try {
        const skuSpecs = await source.getSkuSpecifications(oldSkuId)
        for (const spec of skuSpecs) {
          try {
            const newFieldId = idMap.get('specField', spec.FieldId)
            if (newFieldId === undefined) continue

            await target.setSkuSpecification(newSkuId, {
              FieldId: newFieldId,
              FieldValueId: [spec.FieldValueId],
            })
            created++
          } catch (error) {
            errors++
            const message = error instanceof Error ? error.message : String(error)
            console.error(
              `[step:spec-values] error setting SKU spec for SKU ${oldSkuId}: ${message}`,
            )
          }
        }

        emit({
          type: 'step:progress',
          step,
          current,
          total: totalItems,
          detail: `SKU ${oldSkuId}: ${skuSpecs.length} specs`,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[step:spec-values] could not fetch specs for SKU ${oldSkuId}: ${message}`)
      }
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:spec-values] done: created=${created}, errors=${errors}`)
}
