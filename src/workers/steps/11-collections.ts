import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'

export async function cloneCollections(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
): Promise<void> {
  const step = 'collections'
  console.log('[step:collections] starting')

  // Paginate all collections from source
  const allCollections: Awaited<ReturnType<VtexClient['getCollections']>> = []
  const pageSize = 100
  let from = 0

  try {
    while (true) {
      const page = await source.getCollections(from, from + pageSize - 1)
      if (page.length === 0) break
      allCollections.push(...page)
      from += pageSize
      if (page.length < pageSize) break
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn(`[step:collections] could not fetch collections: ${message}`)
  }

  emit({ type: 'step:start', step, total: allCollections.length })

  let created = 0
  let errors = 0

  for (let i = 0; i < allCollections.length; i++) {
    const collection = allCollections[i]!
    try {
      const newCollection = await target.createCollection({
        Name: collection.Name,
        Description: collection.Description ?? '',
        Searchable: collection.Searchable,
        Highlight: collection.Highlight,
        DateFrom: collection.DateFrom,
        DateTo: collection.DateTo,
      })

      idMap.set('collection', collection.Id, newCollection.Id)
      created++

      // Get SKUs from original collection and associate mapped ones
      try {
        const oldSkuIds = await source.getCollectionProducts(collection.Id)
        for (const oldSkuId of oldSkuIds) {
          const newSkuId = idMap.get('sku', oldSkuId)
          if (newSkuId !== undefined) {
            try {
              await target.addSkuToCollection(newCollection.Id, newSkuId)
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error)
              console.warn(
                `[step:collections] could not add SKU ${newSkuId} to collection ${newCollection.Id}: ${message}`,
              )
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`[step:collections] could not fetch products for collection ${collection.Id}: ${message}`)
      }

      emit({
        type: 'step:progress',
        step,
        current: i + 1,
        total: allCollections.length,
        detail: collection.Name,
      })
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[step:collections] error cloning collection ${collection.Id}: ${message}`)
      emit({
        type: 'step:error',
        step,
        message: `Failed to clone collection "${collection.Name}"`,
        detail: message,
      })
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:collections] done: created=${created}, errors=${errors}`)
}
