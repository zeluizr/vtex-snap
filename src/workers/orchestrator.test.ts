import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { DiscoveredCatalog, EmitFn, VtexCredentials } from './types.js'

vi.mock('./discovery.js', () => ({ discoverCatalog: vi.fn() }))
vi.mock('./steps/01-products.js', () => ({ cloneProducts: vi.fn().mockResolvedValue([]) }))
vi.mock('./steps/02-skus.js', () => ({ cloneSkus: vi.fn().mockResolvedValue([]) }))
vi.mock('./steps/03-spec-values.js', () => ({ cloneSpecValues: vi.fn().mockResolvedValue(undefined) }))

import { runClone } from './orchestrator.js'
import { discoverCatalog } from './discovery.js'
import { cloneProducts } from './steps/01-products.js'
import { cloneSkus } from './steps/02-skus.js'
import { cloneSpecValues } from './steps/03-spec-values.js'

const creds: VtexCredentials = {
  accountName: 'test',
  appKey: 'key',
  appToken: 'token',
  sellerId: 'seller',
}

const ALL_STEPS = ['products', 'skus', 'spec-values']

const emptyCatalog: DiscoveredCatalog = new Map()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(discoverCatalog).mockResolvedValue(emptyCatalog)
  vi.mocked(cloneProducts).mockResolvedValue([])
  vi.mocked(cloneSkus).mockResolvedValue([])
})

describe('runClone', () => {
  it('always runs discovery first', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ['products'], emit)

    expect(discoverCatalog).toHaveBeenCalledOnce()
  })

  it('calls only the steps listed in selectedSteps', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ['products'], emit)

    expect(cloneProducts).toHaveBeenCalledOnce()
    expect(cloneSkus).not.toHaveBeenCalled()
    expect(cloneSpecValues).not.toHaveBeenCalled()
  })

  it('calls all 3 steps when all are selected', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ALL_STEPS, emit)

    expect(cloneProducts).toHaveBeenCalledOnce()
    expect(cloneSkus).toHaveBeenCalledOnce()
    expect(cloneSpecValues).toHaveBeenCalledOnce()
  })

  it('emits complete after all steps finish', async () => {
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await runClone(creds, creds, ['products'], emit)

    const completeEvent = events.find((e) => e.type === 'complete')
    expect(completeEvent).toBeDefined()
    expect(completeEvent).toMatchObject({ type: 'complete' })
  })

  it('emits error event and rethrows when discovery throws', async () => {
    vi.mocked(discoverCatalog).mockRejectedValueOnce(new Error('discovery failure'))
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await expect(runClone(creds, creds, ['products'], emit)).rejects.toThrow('discovery failure')

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toMatchObject({ type: 'error', message: 'discovery failure' })
  })

  it('passes catalog and mappings between products → skus → spec-values', async () => {
    const catalog: DiscoveredCatalog = new Map([
      [1, { oldProductId: 1, brandName: 'Acme', productSpecs: [], skus: [] }],
    ])
    const productMappings = [{ oldProductId: 1, newProductId: 1 }]
    const skuMappings = [{ oldSkuId: 10, newSkuId: 10, productId: 1 }]
    vi.mocked(discoverCatalog).mockResolvedValueOnce(catalog)
    vi.mocked(cloneProducts).mockResolvedValueOnce(productMappings)
    vi.mocked(cloneSkus).mockResolvedValueOnce(skuMappings)
    const emit: EmitFn = vi.fn()

    await runClone(creds, creds, ALL_STEPS, emit)

    expect(cloneProducts).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      catalog,
    )
    expect(cloneSkus).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      catalog,
      productMappings,
    )
    expect(cloneSpecValues).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      catalog,
      productMappings,
      skuMappings,
    )
  })
})
