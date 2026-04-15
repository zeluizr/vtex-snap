import type { VtexClient } from '../../lib/vtex-client.js'
import type { DiscoveredCatalog, EmitFn, SkuContextSpec } from '../types.js'
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
  target: VtexClient,
  emit: EmitFn,
  catalog: DiscoveredCatalog,
  productMappings: ProductSkuMapping[],
  skuMappings: SkuMapping[],
): Promise<void> {
  const step = 'spec-values'

  // Build SKU lookup table once: oldSkuId → context (already fetched during discovery).
  const skuContextById = new Map<number, SkuContextSpec[]>()
  for (const entry of catalog.values()) {
    for (const sku of entry.skus) {
      skuContextById.set(sku.oldSkuId, sku.context.SkuSpecifications ?? [])
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
    const entry = catalog.get(oldProductId)
    const specs = entry?.productSpecs ?? []

    for (const spec of specs) {
      try {
        await target.setProductSpecValue(newProductId, specPayload(spec))
        created++
      } catch (error) {
        errors++
        const detail = error instanceof Error ? error.message : String(error)
        emit({
          type: 'step:error',
          step,
          message: `product ${oldProductId} spec "${spec.FieldName}"`,
          detail,
        })
      }
    }

    emit({
      type: 'step:progress',
      step,
      current,
      total: totalItems,
      detail: `product ${oldProductId}: ${specs.length} specs`,
    })
  }

  // SKU-level specs
  for (const { oldSkuId, newSkuId } of skuMappings) {
    current++
    const specs = skuContextById.get(oldSkuId) ?? []

    for (const spec of specs) {
      try {
        await target.setSkuSpecValue(newSkuId, specPayload(spec))
        created++
      } catch (error) {
        errors++
        const detail = error instanceof Error ? error.message : String(error)
        emit({
          type: 'step:error',
          step,
          message: `sku ${oldSkuId} spec "${spec.FieldName}"`,
          detail,
        })
      }
    }

    emit({
      type: 'step:progress',
      step,
      current,
      total: totalItems,
      detail: `sku ${oldSkuId}: ${specs.length} specs`,
    })
  }

  emit({ type: 'step:complete', step, created, errors })
}
