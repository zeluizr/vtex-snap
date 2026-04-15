import { describe, it, expect, vi } from 'vitest'
import type {
  CategoryWithTreePath,
  DiscoveredCatalog,
  DiscoveredProduct,
  EmitFn,
  Product,
} from '../types.js'
import { cloneProducts } from './01-products.js'
import type { VtexClient } from '../../lib/vtex-client.js'

function makeProduct(id: number, overrides: Partial<Product> = {}): Product {
  return {
    Id: id,
    Name: `Product ${id}`,
    DepartmentId: 100,
    CategoryId: 50,
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

function makeCategory(overrides: Partial<CategoryWithTreePath> = {}): CategoryWithTreePath {
  return {
    Id: 50,
    Name: 'T-Shirts',
    FatherCategoryId: 49,
    Title: '',
    Description: '',
    Keywords: '',
    IsActive: true,
    TreePath: ['Mens', 'Clothing', 'T-Shirts'],
    TreePathIds: [48, 49, 50],
    TreePathLinkIds: ['mens', 'clothing', 't-shirts'],
    ...overrides,
  }
}

function makeCatalogEntry(productId: number, brandName = 'Acme'): DiscoveredProduct {
  return {
    oldProductId: productId,
    brandName,
    productSpecs: [],
    skus: [],
  }
}

function makeCatalog(productIds: number[], brandName = 'Acme'): DiscoveredCatalog {
  const map: DiscoveredCatalog = new Map()
  for (const id of productIds) map.set(id, makeCatalogEntry(id, brandName))
  return map
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('cloneProducts', () => {
  it('skips products that return null (404)', async () => {
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(id === 2 ? null : makeProduct(id))),
      getCategoryWithTreePath: vi.fn().mockResolvedValue(makeCategory()),
    })
    const upsertProduct = vi
      .fn()
      .mockImplementation((p: { Id: number }) =>
        Promise.resolve({ product: makeProduct(p.Id), mode: 'created' as const }),
      )
    const target = mockClient({ upsertProduct })
    const emit: EmitFn = vi.fn()

    const mappings = await cloneProducts(source, target, emit, makeCatalog([1, 2, 3]))

    expect(source.getProductSafe).toHaveBeenCalledTimes(3)
    expect(upsertProduct).toHaveBeenCalledTimes(2)
    expect(mappings).toHaveLength(2)
  })

  it('sends CategoryPath from source category and BrandName from catalog entry', async () => {
    const source = mockClient({
      getProductSafe: vi.fn().mockResolvedValue(makeProduct(7, { CategoryId: 99 })),
      getCategoryWithTreePath: vi
        .fn()
        .mockResolvedValue(makeCategory({ TreePath: ['Sports', 'Gear'] })),
    })
    const upsertProduct = vi
      .fn()
      .mockResolvedValue({ product: makeProduct(7), mode: 'created' as const })
    const target = mockClient({ upsertProduct })
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, emit, makeCatalog([7], 'Nike'))

    expect(upsertProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 7,
        CategoryPath: 'Sports/Gear',
        BrandName: 'Nike',
      }),
    )
  })

  it('caches category lookups across products', async () => {
    const getCategoryWithTreePath = vi.fn().mockResolvedValue(makeCategory())
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(makeProduct(id))),
      getCategoryWithTreePath,
    })
    const upsertProduct = vi
      .fn()
      .mockImplementation((p: { Id: number }) =>
        Promise.resolve({ product: makeProduct(p.Id), mode: 'created' as const }),
      )
    const target = mockClient({ upsertProduct })
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, emit, makeCatalog([1, 2, 3, 4, 5]))

    // 5 products sharing CategoryId 50 → 1 fetch
    expect(getCategoryWithTreePath).toHaveBeenCalledTimes(1)
  })

  it('falls back to category Name when TreePath is empty', async () => {
    const source = mockClient({
      getProductSafe: vi.fn().mockResolvedValue(makeProduct(1)),
      getCategoryWithTreePath: vi
        .fn()
        .mockResolvedValue(makeCategory({ TreePath: null, Name: 'Solo' })),
    })
    const upsertProduct = vi
      .fn()
      .mockResolvedValue({ product: makeProduct(1), mode: 'created' as const })
    const target = mockClient({ upsertProduct })
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, emit, makeCatalog([1]))

    expect(upsertProduct).toHaveBeenCalledWith(expect.objectContaining({ CategoryPath: 'Solo' }))
  })

  it('emits step:error and continues when a product fails', async () => {
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(makeProduct(id))),
      getCategoryWithTreePath: vi.fn().mockResolvedValue(makeCategory()),
    })
    const upsertProduct = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ product: makeProduct(2), mode: 'created' as const })
    const target = mockClient({ upsertProduct })
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    const mappings = await cloneProducts(source, target, emit, makeCatalog([1, 2]))

    const errorEvents = events.filter((e) => e.type === 'step:error')
    expect(errorEvents).toHaveLength(1)
    expect(mappings).toHaveLength(1)
    expect(mappings[0]).toMatchObject({ oldProductId: 2, newProductId: 2 })
  })

  it('emits step:complete with correct counts', async () => {
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(makeProduct(id))),
      getCategoryWithTreePath: vi.fn().mockResolvedValue(makeCategory()),
    })
    const upsertProduct = vi
      .fn()
      .mockImplementation((p: { Id: number }) =>
        Promise.resolve({ product: makeProduct(p.Id), mode: 'created' as const }),
      )
    const target = mockClient({ upsertProduct })
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneProducts(source, target, emit, makeCatalog([1, 2, 3]))

    const complete = events.find((e) => e.type === 'step:complete')
    expect(complete).toMatchObject({ type: 'step:complete', step: 'products', created: 3, errors: 0 })
  })
})
