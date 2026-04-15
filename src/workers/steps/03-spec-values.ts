import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn, SkuContextSpec } from '../types.js'
import type { ProductSkuMapping } from './01-products.js'
import type { SkuMapping } from './02-skus.js'

const DEFAULT_GROUP = 'Especificações'

function specPayload(spec: SkuContextSpec) {
  return {
    FieldName: spec.FieldName,
    GroupName: spec.FieldGroupName ?? DEFAULT_GROUP,
    RootLevelSpecification: true,
    FieldValues: spec.FieldValues ?? [],
  }
}

export async function cloneSpecValues(
  source: VtexClient,
  target: VtexClient,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
  skuMappings: SkuMapping[],
): Promise<void> {
  const step = 'spec-values'
  console.log('[step:spec-values] starting')

  // Index SKU mappings by oldProductId so we can reuse one source SKU per product
  // to fetch product-level specs (instead of duplicating fetches).
  const firstSkuByProduct = new Map<number, SkuMapping>()
  for (const sku of skuMappings) {
    if (!firstSkuByProduct.has(sku.productId)) {
      firstSkuByProduct.set(sku.productId, sku)
    }
  }

  const totalItems = productMappings.length + skuMappings.length
  emit({ type: 'step:start', step, total: totalItems })

  let created = 0
  let errors = 0
  let current = 0

  // Product-level specs
  for (const { oldProductId, newProductId } of productMappings) {
    current++
    const referenceSku = firstSkuByProduct.get(oldProductId)
    if (!referenceSku) {
      emit({
        type: 'step:progress',
        step,
        current,
        total: totalItems,
        detail: `product ${oldProductId}: sem SKUs (skip)`,
      })
      continue
    }

    try {
      const ctx = await source.getSkuContext(referenceSku.oldSkuId)
      const specs = ctx.ProductSpecifications ?? []
      for (const spec of specs) {
        try {
          await target.setProductSpecValue(newProductId, specPayload(spec))
          created++
        } catch (error) {
          errors++
          const message = error instanceof Error ? error.message : String(error)
          console.error(
            `[step:spec-values] product ${oldProductId} spec "${spec.FieldName}": ${message}`,
          )
        }
      }

      emit({
        type: 'step:progress',
        step,
        current,
        total: totalItems,
        detail: `product ${oldProductId}: ${specs.length} specs`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(
        `[step:spec-values] could not fetch context for SKU ${referenceSku.oldSkuId}: ${message}`,
      )
    }
  }

  // SKU-level specs
  for (const { oldSkuId, newSkuId } of skuMappings) {
    current++
    try {
      const ctx = await source.getSkuContext(oldSkuId)
      const specs = ctx.SkuSpecifications ?? []
      for (const spec of specs) {
        try {
          await target.setSkuSpecValue(newSkuId, specPayload(spec))
          created++
        } catch (error) {
          errors++
          const message = error instanceof Error ? error.message : String(error)
          console.error(
            `[step:spec-values] sku ${oldSkuId} spec "${spec.FieldName}": ${message}`,
          )
        }
      }

      emit({
        type: 'step:progress',
        step,
        current,
        total: totalItems,
        detail: `sku ${oldSkuId}: ${specs.length} specs`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[step:spec-values] could not fetch context for SKU ${oldSkuId}: ${message}`)
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:spec-values] done: created=${created}, errors=${errors}`)
}
