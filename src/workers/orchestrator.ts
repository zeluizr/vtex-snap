import { VtexClient } from '../lib/vtex-client.js'
import { discoverCatalog } from './discovery.js'
import { cloneProducts } from './steps/01-products.js'
import { cloneSkus } from './steps/02-skus.js'
import { cloneSpecValues } from './steps/03-spec-values.js'
import type { EmitFn, VtexCredentials } from './types.js'

export interface RunCloneOptions {
  // reserved for future limits/filters
}

export async function runClone(
  source: VtexCredentials,
  target: VtexCredentials,
  selectedSteps: string[],
  emit: EmitFn,
  _options: RunCloneOptions = {},
): Promise<void> {
  const sourceClient = new VtexClient(source)
  const targetClient = new VtexClient(target)

  const should = (step: string) => selectedSteps.includes(step)

  try {
    // Discovery is mandatory because every step depends on the catalog snapshot.
    const catalog = await discoverCatalog(sourceClient, emit)

    const productMappings = should('products')
      ? await cloneProducts(sourceClient, targetClient, emit, catalog)
      : []

    const skuMappings = should('skus')
      ? await cloneSkus(targetClient, emit, catalog, productMappings)
      : []

    if (should('spec-values'))
      await cloneSpecValues(targetClient, emit, catalog, productMappings, skuMappings)

    emit({
      type: 'complete',
      summary: {
        products: productMappings.length,
        skus: skuMappings.length,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    emit({ type: 'error', message })
    throw error
  }
}
