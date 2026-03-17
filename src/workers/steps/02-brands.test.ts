import { describe, it, expect, vi } from 'vitest'
import { IdMap } from '../../lib/id-map.js'
import type { Brand, EmitFn } from '../types.js'
import { cloneBrands } from './02-brands.js'
import type { VtexClient } from '../../lib/vtex-client.js'

function makeBrand(id: number, overrides: Partial<Brand> = {}): Brand {
  return {
    Id: id,
    Name: `Brand ${id}`,
    IsActive: true,
    Title: `Brand ${id}`,
    MetaTagDescription: '',
    ImageUrl: null,
    KeyWords: 'kw1,kw2',
    Keywords: 'kw1,kw2',
    SiteTitle: '',
    Text: '',
    Score: null,
    MenuHome: false,
    LinkId: `brand-${id}`,
    ...overrides,
  }
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('cloneBrands', () => {
  it('emits step:start with correct total', async () => {
    const brands = [makeBrand(1), makeBrand(2)]
    const source = mockClient({ getBrands: vi.fn().mockResolvedValue(brands) })
    const target = mockClient({
      createBrand: vi.fn().mockResolvedValue(makeBrand(100)),
    })
    const idMap = new IdMap()
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneBrands(source, target, idMap, emit)

    expect(events[0]).toMatchObject({ type: 'step:start', step: 'brands', total: 2 })
  })

  it('registers brand mappings in idMap', async () => {
    const brands = [makeBrand(10)]
    const source = mockClient({ getBrands: vi.fn().mockResolvedValue(brands) })
    const target = mockClient({ createBrand: vi.fn().mockResolvedValue(makeBrand(999)) })
    const idMap = new IdMap()
    const emit: EmitFn = vi.fn()

    await cloneBrands(source, target, idMap, emit)

    expect(idMap.get('brand', 10)).toBe(999)
  })

  it('uses KeyWords with fallback to Keywords when KeyWords is nullish', async () => {
    const brand = makeBrand(1, { KeyWords: undefined as unknown as string, Keywords: 'fallback' })
    const source = mockClient({ getBrands: vi.fn().mockResolvedValue([brand]) })
    const createBrand = vi.fn().mockResolvedValue(makeBrand(100))
    const target = mockClient({ createBrand })
    const idMap = new IdMap()
    const emit: EmitFn = vi.fn()

    await cloneBrands(source, target, idMap, emit)

    expect(createBrand).toHaveBeenCalledWith(
      expect.objectContaining({ KeyWords: 'fallback' }),
    )
  })

  it('continues cloning remaining brands when one fails', async () => {
    const brands = [makeBrand(1), makeBrand(2), makeBrand(3)]
    const source = mockClient({ getBrands: vi.fn().mockResolvedValue(brands) })
    const createBrand = vi
      .fn()
      .mockResolvedValueOnce(makeBrand(100))
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(makeBrand(300))
    const target = mockClient({ createBrand })
    const idMap = new IdMap()
    const emit: EmitFn = vi.fn()

    await cloneBrands(source, target, idMap, emit)

    expect(idMap.get('brand', 1)).toBe(100)
    expect(idMap.get('brand', 2)).toBeUndefined()
    expect(idMap.get('brand', 3)).toBe(300)
  })

  it('emits step:progress for each successfully created brand', async () => {
    const brands = [makeBrand(1), makeBrand(2)]
    const source = mockClient({ getBrands: vi.fn().mockResolvedValue(brands) })
    const target = mockClient({
      createBrand: vi
        .fn()
        .mockResolvedValueOnce(makeBrand(100))
        .mockResolvedValueOnce(makeBrand(200)),
    })
    const idMap = new IdMap()
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneBrands(source, target, idMap, emit)

    const progressEvents = events.filter((e) => e.type === 'step:progress')
    expect(progressEvents).toHaveLength(2)
    expect(progressEvents[0]).toMatchObject({ type: 'step:progress', step: 'brands', current: 1, total: 2 })
    expect(progressEvents[1]).toMatchObject({ type: 'step:progress', step: 'brands', current: 2, total: 2 })
  })
})
