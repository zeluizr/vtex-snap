import { describe, it, expect, vi } from 'vitest'
import type { BrandDetail, CategoryWithTreePath, EmitFn, Product } from '../types.js'
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

function makeBrand(overrides: Partial<BrandDetail> = {}): BrandDetail {
  return {
    id: 10,
    name: 'Acme',
    isActive: true,
    title: '',
    metaTagDescription: '',
    imageUrl: null,
    ...overrides,
  }
}

function mockClient(overrides: Partial<VtexClient>): VtexClient {
  return overrides as unknown as VtexClient
}

describe('cloneProducts', () => {
  it('skips IDs that return null (404)', async () => {
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(id === 2 ? null : makeProduct(id))),
      getCategoryWithTreePath: vi.fn().mockResolvedValue(makeCategory()),
      getBrand: vi.fn().mockResolvedValue(makeBrand()),
    })
    const createProduct = vi
      .fn()
      .mockImplementation((p: { Id: number }) => Promise.resolve(makeProduct(p.Id)))
    const target = mockClient({ createProduct })
    const emit: EmitFn = vi.fn()

    const mappings = await cloneProducts(source, target, emit, 1, 3)

    expect(source.getProductSafe).toHaveBeenCalledTimes(3)
    expect(createProduct).toHaveBeenCalledTimes(2)
    expect(mappings).toHaveLength(2)
  })

  it('sends CategoryPath and BrandName resolved from source', async () => {
    const source = mockClient({
      getProductSafe: vi.fn().mockResolvedValue(makeProduct(7, { CategoryId: 99, BrandId: 33 })),
      getCategoryWithTreePath: vi
        .fn()
        .mockResolvedValue(makeCategory({ TreePath: ['Sports', 'Gear'] })),
      getBrand: vi.fn().mockResolvedValue(makeBrand({ name: 'Nike' })),
    })
    const createProduct = vi.fn().mockResolvedValue(makeProduct(7))
    const target = mockClient({ createProduct })
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, emit, 7, 7)

    expect(createProduct).toHaveBeenCalledWith(
      expect.objectContaining({
        Id: 7,
        CategoryPath: 'Sports/Gear',
        BrandName: 'Nike',
      }),
    )
  })

  it('caches category and brand lookups across products', async () => {
    const getCategoryWithTreePath = vi.fn().mockResolvedValue(makeCategory())
    const getBrand = vi.fn().mockResolvedValue(makeBrand())
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(makeProduct(id))),
      getCategoryWithTreePath,
      getBrand,
    })
    const createProduct = vi
      .fn()
      .mockImplementation((p: { Id: number }) => Promise.resolve(makeProduct(p.Id)))
    const target = mockClient({ createProduct })
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, emit, 1, 5)

    expect(getCategoryWithTreePath).toHaveBeenCalledTimes(1)
    expect(getBrand).toHaveBeenCalledTimes(1)
  })

  it('falls back to category Name when TreePath is empty', async () => {
    const source = mockClient({
      getProductSafe: vi.fn().mockResolvedValue(makeProduct(1)),
      getCategoryWithTreePath: vi
        .fn()
        .mockResolvedValue(makeCategory({ TreePath: null, Name: 'Solo' })),
      getBrand: vi.fn().mockResolvedValue(makeBrand()),
    })
    const createProduct = vi.fn().mockResolvedValue(makeProduct(1))
    const target = mockClient({ createProduct })
    const emit: EmitFn = vi.fn()

    await cloneProducts(source, target, emit, 1, 1)

    expect(createProduct).toHaveBeenCalledWith(expect.objectContaining({ CategoryPath: 'Solo' }))
  })

  it('emits step:error and continues when a product fails', async () => {
    const source = mockClient({
      getProductSafe: vi
        .fn()
        .mockImplementation((id: number) => Promise.resolve(makeProduct(id))),
      getCategoryWithTreePath: vi.fn().mockResolvedValue(makeCategory()),
      getBrand: vi.fn().mockResolvedValue(makeBrand()),
    })
    const createProduct = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(makeProduct(2))
    const target = mockClient({ createProduct })
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    const mappings = await cloneProducts(source, target, emit, 1, 2)

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
      getBrand: vi.fn().mockResolvedValue(makeBrand()),
    })
    const createProduct = vi
      .fn()
      .mockImplementation((p: { Id: number }) => Promise.resolve(makeProduct(p.Id)))
    const target = mockClient({ createProduct })
    const events: Parameters<EmitFn>[0][] = []
    const emit: EmitFn = (e) => events.push(e)

    await cloneProducts(source, target, emit, 1, 3)

    const complete = events.find((e) => e.type === 'step:complete')
    expect(complete).toMatchObject({ type: 'step:complete', step: 'products', created: 3, errors: 0 })
  })
})
