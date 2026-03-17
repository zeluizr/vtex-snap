import { IdMap } from '../lib/id-map.js'
import { VtexClient } from '../lib/vtex-client.js'
import { cloneCategories } from './steps/01-categories.js'
import { cloneBrands } from './steps/02-brands.js'
import { cloneTradePolicies } from './steps/03-trade-policies.js'
import { cloneSpecifications } from './steps/04-specifications.js'
import { cloneProducts } from './steps/05-products.js'
import { cloneSkus } from './steps/06-skus.js'
import { cloneImages } from './steps/07-images.js'
import { cloneSpecValues } from './steps/08-spec-values.js'
import { clonePrices } from './steps/09-prices.js'
import { cloneStock } from './steps/10-stock.js'
import { cloneCollections } from './steps/11-collections.js'
import type { EmitFn, VtexCredentials } from './types.js'

export async function runClone(
  source: VtexCredentials,
  target: VtexCredentials,
  selectedSteps: string[],
  emit: EmitFn,
): Promise<void> {
  const sourceClient = new VtexClient(source)
  const targetClient = new VtexClient(target)
  const idMap = new IdMap()

  const should = (step: string) => selectedSteps.includes(step)

  try {
    if (should('categories')) await cloneCategories(sourceClient, targetClient, idMap, emit)
    if (should('brands')) await cloneBrands(sourceClient, targetClient, idMap, emit)
    if (should('trade-policies')) await cloneTradePolicies(sourceClient, targetClient, idMap, emit)
    if (should('specifications')) await cloneSpecifications(sourceClient, targetClient, idMap, emit)

    const productMappings = should('products')
      ? await cloneProducts(sourceClient, targetClient, idMap, emit)
      : []

    if (should('skus')) await cloneSkus(sourceClient, targetClient, idMap, emit, productMappings)
    if (should('images')) await cloneImages(sourceClient, targetClient, idMap, emit, productMappings)
    if (should('spec-values')) await cloneSpecValues(sourceClient, targetClient, idMap, emit, productMappings)
    if (should('prices')) await clonePrices(sourceClient, targetClient, idMap, emit, productMappings)
    if (should('stock')) await cloneStock(sourceClient, targetClient, idMap, emit, productMappings)
    if (should('collections')) await cloneCollections(sourceClient, targetClient, idMap, emit)

    emit({ type: 'complete', summary: idMap.summary() })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emit({ type: 'error', message })
    throw error
  }
}
