import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'
import type { ProductSkuMapping } from './05-products.js'

export async function cloneImages(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
  productMappings: ProductSkuMapping[],
): Promise<void> {
  const step = 'images'
  console.log('[step:images] starting')

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
      const images = await source.getSkuImages(oldSkuId)

      for (const image of images) {
        try {
          await target.createSkuImage(newSkuId, {
            Url: image.Url,
            Name: image.Name,
            IsMain: image.IsMain,
            Label: image.Label ?? undefined,
          })
          created++
        } catch (error) {
          errors++
          const message = error instanceof Error ? error.message : String(error)
          console.error(`[step:images] error uploading image for SKU ${oldSkuId}: ${message}`)
        }
      }

      emit({
        type: 'step:progress',
        step,
        current: i + 1,
        total: allSkuIds.length,
        detail: `SKU ${oldSkuId}: ${images.length} images`,
      })
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[step:images] error fetching images for SKU ${oldSkuId}: ${message}`)
      emit({
        type: 'step:error',
        step,
        message: `Failed to fetch images for SKU ${oldSkuId}`,
        detail: message,
      })
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:images] done: created=${created}, errors=${errors}`)
}
