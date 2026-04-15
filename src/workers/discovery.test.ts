import { describe, it, expect, vi } from 'vitest'
import type { VtexClient } from '../lib/vtex-client.js'
import type { EmitFn, SkuContext } from './types.js'
import { discoverCatalog } from './discovery.js'

function makeContext(skuId: number, productId: number, overrides: Partial<SkuContext> = {}): SkuContext {
  return {
    Id: skuId,
    ProductId: productId,
    SkuName: `SKU ${skuId}`,
    IsActive: true,
    IsKit: false,
    BrandName: 'Acme',
    Dimension: { cubicweight: 0, height: 0, length: 0, weight: 0, width: 0 },
    RealDimension: { realCubicWeight: 0, realHeight: 0, realLength: 0, realWeight: 0, realWidth: 0 },
    ManufacturerCode: '',
    CommercialConditionId: 1,
    MeasurementUnit: 'un',
    UnitMultiplier: 1,
    ModalType: null,
    RewardValue: null,
    EstimatedDateArrival: null,
    AlternateIds: {},
    Videos: [],
    ProductSpecifications: [],
    SkuSpecifications: [],
    ...overrides,
  }
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('discoverCatalog', () => {
  it('paginates getSkuIds until an empty or short page is returned', async () => {
    // Build two full pages of 1000 plus a final short page to exercise both stop conditions.
    const fullPage = Array.from({ length: 1000 }, (_, i) => i + 1)
    const secondFullPage = Array.from({ length: 1000 }, (_, i) => i + 1001)
    const getSkuIds = vi
      .fn()
      .mockResolvedValueOnce(fullPage)
      .mockResolvedValueOnce(secondFullPage)
      .mockResolvedValueOnce([2001, 2002]) // short page → stop after this
    const source = mockClient({
      getSkuIds,
      getSkuContextSafe: vi.fn().mockImplementation((id: number) =>
        Promise.resolve(makeContext(id, id)),
      ),
    })
    const emit: EmitFn = vi.fn()

    await discoverCatalog(source, emit)

    expect(getSkuIds).toHaveBeenCalledTimes(3)
  })

  it('groups SKUs by ProductId and copies brand and product specs from first SKU seen', async () => {
    const source = mockClient({
      getSkuIds: vi.fn().mockResolvedValueOnce([10, 11, 20]).mockResolvedValueOnce([]),
      getSkuContextSafe: vi.fn().mockImplementation((id: number) => {
        if (id === 10) return Promise.resolve(makeContext(10, 1, { BrandName: 'BrandA', ProductSpecifications: [{ FieldId: 1, FieldName: 'Material', FieldValueIds: [], FieldValues: ['Cotton'] }] }))
        if (id === 11) return Promise.resolve(makeContext(11, 1, { BrandName: 'IGNORED' }))
        return Promise.resolve(makeContext(20, 2, { BrandName: 'BrandB' }))
      }),
    })
    const emit: EmitFn = vi.fn()

    const catalog = await discoverCatalog(source, emit)

    expect(catalog.size).toBe(2)
    expect(catalog.get(1)).toMatchObject({ brandName: 'BrandA' })
    expect(catalog.get(1)?.skus).toHaveLength(2)
    expect(catalog.get(1)?.productSpecs[0]?.FieldName).toBe('Material')
    expect(catalog.get(2)).toMatchObject({ brandName: 'BrandB' })
    expect(catalog.get(2)?.skus).toHaveLength(1)
  })

  it('skips SKUs whose context returns null (404)', async () => {
    const source = mockClient({
      getSkuIds: vi.fn().mockResolvedValueOnce([1, 2, 3]).mockResolvedValueOnce([]),
      getSkuContextSafe: vi.fn().mockImplementation((id: number) =>
        Promise.resolve(id === 2 ? null : makeContext(id, id)),
      ),
    })
    const emit: EmitFn = vi.fn()

    const catalog = await discoverCatalog(source, emit)

    expect(catalog.size).toBe(2)
    expect(catalog.has(2)).toBe(false)
  })

  it('emits step:start, progress and complete with skip count as errors', async () => {
    const source = mockClient({
      getSkuIds: vi.fn().mockResolvedValueOnce([1, 2]).mockResolvedValueOnce([]),
      getSkuContextSafe: vi
        .fn()
        .mockImplementation((id: number) =>
          Promise.resolve(id === 2 ? null : makeContext(id, id)),
        ),
    })
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await discoverCatalog(source, emit)

    expect(events[0]).toMatchObject({ type: 'step:start', step: 'discovery', total: 2 })
    const complete = events.find((e) => e.type === 'step:complete')
    expect(complete).toMatchObject({ type: 'step:complete', step: 'discovery', created: 1, errors: 1 })
  })
})
