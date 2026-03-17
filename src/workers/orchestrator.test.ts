import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EmitFn, VtexCredentials } from './types.js'

vi.mock('./steps/01-categories.js', () => ({ cloneCategories: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/02-brands.js', () => ({ cloneBrands: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/03-trade-policies.js', () => ({ cloneTradePolicies: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/04-specifications.js', () => ({ cloneSpecifications: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/05-products.js', () => ({ cloneProducts: vi.fn().mockResolvedValue([]) }))
vi.mock('./steps/06-skus.js', () => ({ cloneSkus: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/07-images.js', () => ({ cloneImages: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/08-spec-values.js', () => ({ cloneSpecValues: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/09-prices.js', () => ({ clonePrices: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/10-stock.js', () => ({ cloneStock: vi.fn().mockResolvedValue(undefined) }))
vi.mock('./steps/11-collections.js', () => ({ cloneCollections: vi.fn().mockResolvedValue(undefined) }))

import { runClone } from './orchestrator.js'
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

const creds: VtexCredentials = {
  accountName: 'test',
  appKey: 'key',
  appToken: 'token',
  sellerId: 'seller',
}

const ALL_STEPS = [
  'categories', 'brands', 'trade-policies', 'specifications',
  'products', 'skus', 'images', 'spec-values', 'prices', 'stock', 'collections',
]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cloneProducts).mockResolvedValue([])
})

describe('runClone', () => {
  it('calls only the steps listed in selectedSteps', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ['brands', 'collections'], emit)

    expect(cloneCategories).not.toHaveBeenCalled()
    expect(cloneBrands).toHaveBeenCalledOnce()
    expect(cloneCollections).toHaveBeenCalledOnce()
    expect(cloneSkus).not.toHaveBeenCalled()
  })

  it('calls all 11 steps when all are selected', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ALL_STEPS, emit)

    expect(cloneCategories).toHaveBeenCalledOnce()
    expect(cloneBrands).toHaveBeenCalledOnce()
    expect(cloneTradePolicies).toHaveBeenCalledOnce()
    expect(cloneSpecifications).toHaveBeenCalledOnce()
    expect(cloneProducts).toHaveBeenCalledOnce()
    expect(cloneSkus).toHaveBeenCalledOnce()
    expect(cloneImages).toHaveBeenCalledOnce()
    expect(cloneSpecValues).toHaveBeenCalledOnce()
    expect(clonePrices).toHaveBeenCalledOnce()
    expect(cloneStock).toHaveBeenCalledOnce()
    expect(cloneCollections).toHaveBeenCalledOnce()
  })

  it('emits complete after all steps finish', async () => {
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await runClone(creds, creds, ['brands'], emit)

    const completeEvent = events.find((e) => e.type === 'complete')
    expect(completeEvent).toBeDefined()
    expect(completeEvent).toMatchObject({ type: 'complete' })
  })

  it('emits error event and rethrows when a step throws', async () => {
    vi.mocked(cloneBrands).mockRejectedValueOnce(new Error('network failure'))
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await expect(runClone(creds, creds, ['brands'], emit)).rejects.toThrow('network failure')

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toMatchObject({ type: 'error', message: 'network failure' })
  })

  it('passes productMappings returned by cloneProducts to dependent steps', async () => {
    const mappings = [{ oldProductId: 1, newProductId: 100, skuIds: [10, 11] }]
    vi.mocked(cloneProducts).mockResolvedValueOnce(mappings)
    const emit: EmitFn = vi.fn()

    await runClone(creds, creds, ['products', 'skus', 'images', 'spec-values', 'prices', 'stock'], emit)

    expect(cloneSkus).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), mappings)
    expect(cloneImages).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), mappings)
    expect(cloneSpecValues).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), mappings)
    expect(clonePrices).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), mappings)
    expect(cloneStock).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.anything(), expect.anything(), mappings)
  })

  it('passes empty array to dependent steps when products step is skipped', async () => {
    const emit: EmitFn = vi.fn()

    await runClone(creds, creds, ['skus', 'images'], emit)

    expect(cloneProducts).not.toHaveBeenCalled()
    expect(cloneSkus).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), [],
    )
    expect(cloneImages).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.anything(), expect.anything(), [],
    )
  })
})
