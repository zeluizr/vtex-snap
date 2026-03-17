import { describe, it, expect, vi } from 'vitest'
import { IdMap } from '../../lib/id-map.js'
import type { Category, EmitFn } from '../types.js'
import { cloneCategories, flattenTree } from './01-categories.js'
import type { VtexClient } from '../../lib/vtex-client.js'

function makeCategory(id: number, fatherId: number | null = null, children: Category[] = []): Category {
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
    HasChildren: children.length > 0,
    Children: children,
  }
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('flattenTree', () => {
  it('returns empty array for empty input', () => {
    expect(flattenTree([])).toEqual([])
  })

  it('returns flat list unchanged', () => {
    const cats = [makeCategory(1), makeCategory(2), makeCategory(3)]
    expect(flattenTree(cats)).toEqual(cats)
  })

  it('flattens 2-level tree with parent before children', () => {
    const child1 = makeCategory(2, 1)
    const child2 = makeCategory(3, 1)
    const parent = makeCategory(1, null, [child1, child2])
    const result = flattenTree([parent])
    expect(result.map((c) => c.Id)).toEqual([1, 2, 3])
  })

  it('flattens 3-level tree in correct order', () => {
    const grandchild = makeCategory(3, 2)
    const child = makeCategory(2, 1, [grandchild])
    const parent = makeCategory(1, null, [child])
    const result = flattenTree([parent])
    expect(result.map((c) => c.Id)).toEqual([1, 2, 3])
  })

  it('handles multiple root nodes with sub-trees', () => {
    const child1 = makeCategory(3, 1)
    const child2 = makeCategory(4, 2)
    const root1 = makeCategory(1, null, [child1])
    const root2 = makeCategory(2, null, [child2])
    const result = flattenTree([root1, root2])
    expect(result.map((c) => c.Id)).toEqual([1, 3, 2, 4])
  })
})

describe('cloneCategories', () => {
  it('emits step:start with correct total', async () => {
    const cats = [makeCategory(1), makeCategory(2)]
    const source = mockClient({ getCategoryTree: vi.fn().mockResolvedValue(cats) })
    const target = mockClient({
      createCategory: vi.fn().mockResolvedValue(makeCategory(100)),
    })
    const idMap = new IdMap()
    const events: ReturnType<EmitFn extends (e: infer E) => void ? () => E : never>[] = []
    const emit: EmitFn = (e) => events.push(e as never)

    await cloneCategories(source, target, idMap, emit)

    expect(events[0]).toMatchObject({ type: 'step:start', step: 'categories', total: 2 })
  })

  it('calls target.createCategory and registers mapping in idMap', async () => {
    const cats = [makeCategory(10)]
    const source = mockClient({ getCategoryTree: vi.fn().mockResolvedValue(cats) })
    const createdCat = makeCategory(999)
    const createCategory = vi.fn().mockResolvedValue(createdCat)
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const emit: EmitFn = vi.fn()

    await cloneCategories(source, target, idMap, emit)

    expect(createCategory).toHaveBeenCalledOnce()
    expect(idMap.get('category', 10)).toBe(999)
  })

  it('maps FatherCategoryId using idMap when parent was cloned in same run', async () => {
    const child = makeCategory(2, 1)
    const parent = makeCategory(1, null, [child])
    const source = mockClient({ getCategoryTree: vi.fn().mockResolvedValue([parent]) })
    let callCount = 0
    const createCategory = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve(makeCategory(callCount === 1 ? 100 : 200))
    })
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const emit: EmitFn = vi.fn()

    await cloneCategories(source, target, idMap, emit)

    // Child's createCategory call should receive the mapped parent id (100)
    const childCall = createCategory.mock.calls[1]
    expect(childCall?.[0]).toMatchObject({ FatherCategoryId: 100 })
  })

  it('emits step:error and continues when createCategory throws', async () => {
    const cats = [makeCategory(1), makeCategory(2)]
    const source = mockClient({ getCategoryTree: vi.fn().mockResolvedValue(cats) })
    const createCategory = vi
      .fn()
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce(makeCategory(200))
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneCategories(source, target, idMap, emit)

    const errorEvents = events.filter((e) => e.type === 'step:error')
    expect(errorEvents).toHaveLength(1)
    // Still created the second one
    expect(idMap.get('category', 2)).toBe(200)
  })

  it('emits step:complete with correct created/errors counts', async () => {
    const cats = [makeCategory(1), makeCategory(2), makeCategory(3)]
    const source = mockClient({ getCategoryTree: vi.fn().mockResolvedValue(cats) })
    const createCategory = vi
      .fn()
      .mockResolvedValueOnce(makeCategory(100))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeCategory(300))
    const target = mockClient({ createCategory })
    const idMap = new IdMap()
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneCategories(source, target, idMap, emit)

    const complete = events.find((e) => e.type === 'step:complete')
    expect(complete).toMatchObject({ type: 'step:complete', step: 'categories', created: 2, errors: 1 })
  })
})
