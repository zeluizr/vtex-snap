import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { EmitFn, VtexCredentials } from './types.js'

vi.mock('./steps/01-products.js', () => ({ cloneProducts: vi.fn().mockResolvedValue([]) }))
vi.mock('./steps/02-skus.js', () => ({ cloneSkus: vi.fn().mockResolvedValue([]) }))
vi.mock('./steps/03-spec-values.js', () => ({ cloneSpecValues: vi.fn().mockResolvedValue(undefined) }))

import { runClone } from './orchestrator.js'
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

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(cloneProducts).mockResolvedValue([])
  vi.mocked(cloneSkus).mockResolvedValue([])
})

describe('runClone', () => {
  it('calls only the steps listed in selectedSteps', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ['products'], emit, { productIdFrom: 1, productIdTo: 5 })

    expect(cloneProducts).toHaveBeenCalledOnce()
    expect(cloneSkus).not.toHaveBeenCalled()
    expect(cloneSpecValues).not.toHaveBeenCalled()
  })

  it('calls all 3 steps when all are selected', async () => {
    const emit: EmitFn = vi.fn()
    await runClone(creds, creds, ALL_STEPS, emit, { productIdFrom: 1, productIdTo: 5 })

    expect(cloneProducts).toHaveBeenCalledOnce()
    expect(cloneSkus).toHaveBeenCalledOnce()
    expect(cloneSpecValues).toHaveBeenCalledOnce()
  })

  it('emits complete after all steps finish', async () => {
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await runClone(creds, creds, ['products'], emit, { productIdFrom: 1, productIdTo: 1 })

    const completeEvent = events.find((e) => e.type === 'complete')
    expect(completeEvent).toBeDefined()
    expect(completeEvent).toMatchObject({ type: 'complete' })
  })

  it('emits error event and rethrows when a step throws', async () => {
    vi.mocked(cloneProducts).mockRejectedValueOnce(new Error('network failure'))
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await expect(
      runClone(creds, creds, ['products'], emit, { productIdFrom: 1, productIdTo: 1 }),
    ).rejects.toThrow('network failure')

    const errorEvent = events.find((e) => e.type === 'error')
    expect(errorEvent).toMatchObject({ type: 'error', message: 'network failure' })
  })

  it('passes mappings between products → skus → spec-values', async () => {
    const productMappings = [{ oldProductId: 1, newProductId: 1 }]
    const skuMappings = [{ oldSkuId: 10, newSkuId: 10, productId: 1 }]
    vi.mocked(cloneProducts).mockResolvedValueOnce(productMappings)
    vi.mocked(cloneSkus).mockResolvedValueOnce(skuMappings)
    const emit: EmitFn = vi.fn()

    await runClone(creds, creds, ['products', 'skus', 'spec-values'], emit, {
      productIdFrom: 1,
      productIdTo: 5,
    })

    expect(cloneSkus).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      productMappings,
    )
    expect(cloneSpecValues).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      productMappings,
      skuMappings,
    )
  })
})
