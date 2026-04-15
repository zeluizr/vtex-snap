import { describe, it, expect, vi } from 'vitest'
import { IdMap } from '../../lib/id-map.js'
import type { CategoryTreeNode, EmitFn, Product, ProductAndSkuIds } from '../types.js'
import { cloneProducts } from './05-products.js'
import type { VtexClient } from '../../lib/vtex-client.js'

function makeCategoryNode(id: number, children: CategoryTreeNode[] = []): CategoryTreeNode {
  return {
    Id: id,
    Name: `Cat ${id}`,
    HasChildren: children.length > 0,
    Url: `https://example.com/cat-${id}`,
    Children: children,
  }
}

function makeProduct(id: number, overrides: Partial<Product> = {}): Product {
  return {
    Id: id,
    Name: `Product ${id}`,
    DepartmentId: 100,
    CategoryId: 100,
    BrandId: 10,
    LinkId: `product-${id}`,
    RefId: `REF${id}`,
    IsVisible: true,
    Description: 'desc',
    DescriptionShort: 'short',
    ReleaseDate: '2024-01-01',
    KeyWords: '',
    Title: `Product ${id}`,
    IsActive: true,
    TaxCode: '',
    MetaTagDescription: '',
    SupplierId: null,
    ShowWithoutStock: false,
    Score: null,
    CubicWeight: 0,
    AdWordsRemarketingCode: '',
    LomadeeCampaignCode: '',
    ...overrides,
  }
}

function makeProductAndSkuIds(
  data: Record<string, number[]>,
  total: number,
  from: number = 0,
): ProductAndSkuIds {
  return { data, range: { total, from, to: from + Object.keys(data).length - 1 } }
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('cloneProducts', () => {
  it('skips categories without mapping in idMap', async () => {
    const source = mockClient({
      getCategoryTree: vi.fn().mockResolvedValue([makeCategoryNode(10)]),
      getProductAndSkuIds: vi.fn(),
    })
    const target = mockClient({ createProduct: vi.fn() })
    const idMap = new IdMap()
    // No mapping for category 10
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, idMap, emit)

    expect(source.getProductAndSkuIds).not.toHaveBeenCalled()
    expect(target.createProduct).not.toHaveBeenCalled()
  })

  it('clones product and registers id mapping', async () => {
    const source = mockClient({
      getCategoryTree: vi.fn().mockResolvedValue([makeCategoryNode(10)]),
      getProductAndSkuIds: vi.fn().mockResolvedValue(makeProductAndSkuIds({ '1': [11] }, 1)),
      getProduct: vi.fn().mockResolvedValue(makeProduct(1)),
    })
    const target = mockClient({ createProduct: vi.fn().mockResolvedValue(makeProduct(999)) })
    const idMap = new IdMap()
    idMap.set('category', 10, 100)
    const emit: EmitFn = vi.fn()

    const mappings = await cloneProducts(source, target, idMap, emit)

    expect(idMap.get('product', 1)).toBe(999)
    expect(mappings).toHaveLength(1)
    expect(mappings[0]).toMatchObject({ oldProductId: 1, newProductId: 999, skuIds: [11] })
  })

  it('uses BrandId from source when brand was not mapped', async () => {
    const product = makeProduct(1, { BrandId: 42 })
    const source = mockClient({
      getCategoryTree: vi.fn().mockResolvedValue([makeCategoryNode(10)]),
      getProductAndSkuIds: vi.fn().mockResolvedValue(makeProductAndSkuIds({ '1': [] }, 1)),
      getProduct: vi.fn().mockResolvedValue(product),
    })
    const createProduct = vi.fn().mockResolvedValue(makeProduct(100))
    const target = mockClient({ createProduct })
    const idMap = new IdMap()
    idMap.set('category', 10, 100)
    // No brand mapping
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, idMap, emit)

    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ BrandId: 42 }))
  })

  it('uses mapped BrandId when brand was cloned', async () => {
    const product = makeProduct(1, { BrandId: 42 })
    const source = mockClient({
      getCategoryTree: vi.fn().mockResolvedValue([makeCategoryNode(10)]),
      getProductAndSkuIds: vi.fn().mockResolvedValue(makeProductAndSkuIds({ '1': [] }, 1)),
      getProduct: vi.fn().mockResolvedValue(product),
    })
    const createProduct = vi.fn().mockResolvedValue(makeProduct(100))
    const target = mockClient({ createProduct })
    const idMap = new IdMap()
    idMap.set('category', 10, 100)
    idMap.set('brand', 42, 420)
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, idMap, emit)

    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ BrandId: 420 }))
  })

  it('emits step:error and continues when a product fails', async () => {
    const source = mockClient({
      getCategoryTree: vi.fn().mockResolvedValue([makeCategoryNode(10)]),
      getProductAndSkuIds: vi.fn().mockResolvedValue(makeProductAndSkuIds({ '1': [], '2': [] }, 2)),
      getProduct: vi.fn().mockResolvedValue(makeProduct(1)),
    })
    const createProduct = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeProduct(200))
    const target = mockClient({ createProduct })
    const idMap = new IdMap()
    idMap.set('category', 10, 100)
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    const mappings = await cloneProducts(source, target, idMap, emit)

    const errorEvents = events.filter((e) => e.type === 'step:error')
    expect(errorEvents).toHaveLength(1)
    // Second product still cloned
    expect(mappings).toHaveLength(1)
  })

  it('paginates product ids until range.total is exhausted', async () => {
    const getProductAndSkuIds = vi
      .fn()
      .mockResolvedValueOnce(makeProductAndSkuIds({ '1': [10] }, 60, 0))
      .mockResolvedValueOnce(makeProductAndSkuIds({ '2': [20] }, 60, 50))
    const source = mockClient({
      getCategoryTree: vi.fn().mockResolvedValue([makeCategoryNode(10)]),
      getProductAndSkuIds,
      getProduct: vi.fn().mockImplementation((id: number) => Promise.resolve(makeProduct(id))),
    })
    const target = mockClient({
      createProduct: vi.fn().mockImplementation((p: { RefId: string }) =>
        Promise.resolve(makeProduct(parseInt(p.RefId.replace('REF', ''), 10) + 1000)),
      ),
    })
    const idMap = new IdMap()
    idMap.set('category', 10, 100)
    const emit: EmitFn = vi.fn()

    const mappings = await cloneProducts(source, target, idMap, emit)

    expect(getProductAndSkuIds).toHaveBeenCalledTimes(2)
    expect(mappings).toHaveLength(2)
  })
})
