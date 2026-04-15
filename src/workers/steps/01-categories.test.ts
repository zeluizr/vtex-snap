import { describe, it, expect, vi } from 'vitest'
import { IdMap } from '../../lib/id-map.js'
import type { Category, EmitFn } from '../types.js'
import { cloneCategories, orderByHierarchy } from './01-categories.js'
import type { VtexClient } from '../../lib/vtex-client.js'

function makeCategory(id: number, fatherId: number | null = null): Category {
  return {
    Id: id,
    Name: `Category ${id}`,
    FatherCategoryId: fatherId,
    Title: `Title ${id}`,
    Description: '',
    Keywords: '',
    IsActive: true,
    LomadeeCampaignCode: '',
    AdWordsRemarketingCode: '',
    ShowInStoreFront: true,
    ShowBrandFilter: true,
    ActiveStoreFrontLink: true,
    GlobalCategoryId: 0,
    StockKeepingUnitSelectionMode: 'COMBO',
    Score: null,
    LinkId: `cat-${id}`,
    HasChildren: false,
  }
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('orderByHierarchy', () => {
  it('returns empty array for empty input', () => {
    expect(orderByHierarchy([])).toEqual([])
  })

  it('places parents before children', () => {
    const child = makeCategory(2, 1)
    const parent = makeCategory(1, null)
    const result = orderByHierarchy([child, parent])
    expect(result.map((c) => c.Id)).toEqual([1, 2])
  })

  it('handles deep nesting', () => {
    const grandchild = makeCategory(3, 2)
    const child = makeCategory(2, 1)
    const parent = makeCategory(1, null)
    const result = orderByHierarchy([grandchild, child, parent])
    expect(result.map((c) => c.Id)).toEqual([1, 2, 3])
  })

  it('orphan children (parent missing) are still included', () => {
    const orphan = makeCategory(5, 99)
    const root = makeCategory(1, null)
    const result = orderByHierarchy([orphan, root])
    expect(result.map((c) => c.Id).sort()).toEqual([1, 5])
  })
})

describe('cloneCategories', () => {
  it('skips IDs that return null (404)', async () => {
    const source = mockClient({
      getCategoryByIdSafe: vi.fn().mockImplementation((id: number) =>
        Promise.resolve(id === 2 ? null : makeCategory(id)),
      ),
    })
    const createCategory = vi.fn().mockImplementation((data: { Name: string }) =>
      Promise.resolve(makeCategory(parseInt(data.Name.split(' ')[1]!, 10) + 100)),
    )
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneCategories(source, target, idMap, emit, [1, 2, 3])

    expect(source.getCategoryByIdSafe).toHaveBeenCalledTimes(3)
    expect(createCategory).toHaveBeenCalledTimes(2)
    expect(events[0]).toMatchObject({ type: 'step:start', total: 2 })
  })

  it('maps FatherCategoryId via idMap when parent was cloned in same run', async () => {
    const source = mockClient({
      getCategoryByIdSafe: vi.fn().mockImplementation((id: number) =>
        Promise.resolve(id === 1 ? makeCategory(1) : id === 2 ? makeCategory(2, 1) : null),
      ),
    })
    let callCount = 0
    const createCategory = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(makeCategory(callCount === 1 ? 100 : 200))
    })
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const emit: EmitFn = vi.fn()

    await cloneCategories(source, target, idMap, emit, [1, 2])

    const childCall = createCategory.mock.calls[1]
    expect(childCall?.[0]).toMatchObject({ FatherCategoryId: 100 })
  })

  it('emits step:complete with correct counts on errors', async () => {
    const source = mockClient({
      getCategoryByIdSafe: vi.fn().mockImplementation((id: number) =>
        Promise.resolve(makeCategory(id)),
      ),
    })
    const createCategory = vi
      .fn()
      .mockResolvedValueOnce(makeCategory(100))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeCategory(300))
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneCategories(source, target, idMap, emit, [1, 2, 3])

    const complete = events.find((e) => e.type === 'step:complete')
    expect(complete).toMatchObject({ type: 'step:complete', step: 'categories', created: 2, errors: 1 })
  })
})
