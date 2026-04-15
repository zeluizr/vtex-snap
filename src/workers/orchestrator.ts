import { VtexClient } from '../lib/vtex-client.js'
import { cloneProducts } from './steps/01-products.js'
import { cloneSkus } from './steps/02-skus.js'
import { cloneSpecValues } from './steps/03-spec-values.js'
import type { EmitFn, VtexCredentials } from './types.js'

export interface RunCloneOptions {
  productIdFrom?: number
  productIdTo?: number
}

export async function runClone(
  source: VtexCredentials,
  target: VtexCredentials,
  selectedSteps: string[],
  emit: EmitFn,
  options: RunCloneOptions = {},
): Promise<void> {
  const sourceClient = new VtexClient(source)
  const targetClient = new VtexClient(target)

  const should = (step: string) => selectedSteps.includes(step)
  const productIdFrom = options.productIdFrom ?? 1
  const productIdTo = options.productIdTo ?? 0

  try {
    const productMappings = should('products')
      ? await cloneProducts(sourceClient, targetClient, emit, productIdFrom, productIdTo)
      : []

    const skuMappings = should('skus')
      ? await cloneSkus(sourceClient, targetClient, emit, productMappings)
      : []

    if (should('spec-values'))
      await cloneSpecValues(sourceClient, targetClient, emit, productMappings, skuMappings)

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
