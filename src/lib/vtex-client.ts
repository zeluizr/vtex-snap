import type {
  Brand,
  Category,
  Collection,
  CreateBrand,
  CreateCategory,
  CreateCollection,
  CreateProduct,
  CreateSku,
  CreateSkuImage,
  CreateSpecField,
  CreateSpecGroup,
  Inventory,
  Price,
  Product,
  ProductAndSkuIds,
  ProductSpec,
  SetPrice,
  SetProductSpec,
  SetSkuSpec,
  Sku,
  SkuImage,
  SkuSpec,
  SpecField,
  SpecGroup,
  TradePolicy,
  UpdateInventory,
  Warehouse,
} from '../workers/types.js'
import { throttle } from './throttle.js'

interface VtexClientConfig {
  accountName: string
  appKey: string
  appToken: string
}

const REQUEST_TIMEOUT_MS = 30000
const MAX_RETRIES = 3

export class VtexClient {
  private readonly accountName: string
  private readonly headers: Record<string, string>

  constructor(config: VtexClientConfig) {
    this.accountName = config.accountName
    this.headers = {
      'Content-Type': 'application/json',
      'X-VTEX-API-AppKey': config.appKey,
      'X-VTEX-API-AppToken': config.appToken,
    }
  }

  private catalogUrl(path: string): string {
    return `https://${this.accountName}.vtexcommercestable.com.br/api/catalog${path}`
  }

  private catalogSystemUrl(path: string): string {
    return `https://${this.accountName}.vtexcommercestable.com.br/api/catalog_system${path}`
  }

  private pricingUrl(path: string): string {
    return `https://api.vtex.com/${this.accountName}/pricing${path}`
  }

  private logisticsUrl(path: string): string {
    return `https://${this.accountName}.vtexcommercestable.com.br/api/logistics${path}`
  }

  private async request<T>(
    url: string,
    options: RequestInit = {},
    retries: number = MAX_RETRIES,
  ): Promise<T> {
    await throttle.acquire()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      let response: Response
      try {
        response = await fetch(url, {
          ...options,
          headers: { ...this.headers, ...options.headers },
          signal: controller.signal,
        })
      } finally {
        clearTimeout(timeoutId)
      }

      if (response.status === 429 && retries > 0) {
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 60000
        console.warn(`[vtex-client] 429 rate limit hit for ${url}, waiting ${waitMs}ms`)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        return this.request<T>(url, options, retries - 1)
      }

      if (!response.ok) {
        const body = await response.text().catch(() => '')
        throw new Error(`HTTP ${response.status} ${response.statusText} — ${url}\n${body}`)
      }

      if (response.status === 204) {
        return undefined as T
      }

      return response.json() as Promise<T>
    } finally {
      throttle.release()
    }
  }

  // Catalog — Categories

  async getCategoryTree(levels: number = 3): Promise<Category[]> {
    return this.request<Category[]>(
      this.catalogSystemUrl(`/pvt/category/tree/${levels}`),
    )
  }

  async createCategory(data: CreateCategory): Promise<Category> {
    return this.request<Category>(this.catalogUrl('/pvt/category'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Catalog — Brands

  async getBrands(): Promise<Brand[]> {
    return this.request<Brand[]>(this.catalogSystemUrl('/pvt/brand/list'))
  }

  async createBrand(data: CreateBrand): Promise<Brand> {
    return this.request<Brand>(this.catalogUrl('/pvt/brand'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Trade Policies

  async getTradePolicies(): Promise<TradePolicy[]> {
    return this.request<TradePolicy[]>(this.catalogUrl('/pvt/tradepolicy'))
  }

  // Specifications

  async getSpecificationGroups(categoryId: number): Promise<SpecGroup[]> {
    return this.request<SpecGroup[]>(
      this.catalogUrl(`/pvt/specificationgroup/listByCategoryId/${categoryId}`),
    )
  }

  async createSpecificationGroup(data: CreateSpecGroup): Promise<SpecGroup> {
    return this.request<SpecGroup>(this.catalogUrl('/pvt/specificationgroup'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getSpecificationFields(categoryId: number): Promise<SpecField[]> {
    return this.request<SpecField[]>(
      this.catalogUrl(`/pvt/specificationfield/listByCategoryId/${categoryId}`),
    )
  }

  async createSpecificationField(data: CreateSpecField): Promise<SpecField> {
    return this.request<SpecField>(this.catalogUrl('/pvt/specificationfield'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getProductSpecifications(productId: number): Promise<ProductSpec[]> {
    return this.request<ProductSpec[]>(
      this.catalogUrl(`/pvt/product/${productId}/specification`),
    )
  }

  async setProductSpecification(productId: number, data: SetProductSpec): Promise<void> {
    return this.request<void>(
      this.catalogUrl(`/pvt/product/${productId}/specification`),
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  }

  async getSkuSpecifications(skuId: number): Promise<SkuSpec[]> {
    return this.request<SkuSpec[]>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}/specification`),
    )
  }

  async setSkuSpecification(skuId: number, data: SetSkuSpec): Promise<void> {
    return this.request<void>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}/specification`),
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  }

  // Products

  async getProductAndSkuIds(
    categoryId: number,
    from: number,
    to: number,
  ): Promise<ProductAndSkuIds> {
    return this.request<ProductAndSkuIds>(
      this.catalogSystemUrl(
        `/pvt/products/GetProductAndSkuIds?categoryId=${categoryId}&_from=${from}&_to=${to}`,
      ),
    )
  }

  async getProduct(productId: number): Promise<Product> {
    return this.request<Product>(this.catalogUrl(`/pvt/product/${productId}`))
  }

  async createProduct(data: CreateProduct): Promise<Product> {
    return this.request<Product>(this.catalogUrl('/pvt/product'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // SKUs

  async getSku(skuId: number): Promise<Sku> {
    return this.request<Sku>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}`),
    )
  }

  async createSku(data: CreateSku): Promise<Sku> {
    return this.request<Sku>(this.catalogUrl('/pvt/stockkeepingunit'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async activateSku(skuId: number): Promise<void> {
    return this.request<void>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}`),
      {
        method: 'PUT',
        body: JSON.stringify({ IsActive: true }),
      },
    )
  }

  // SKU Images

  async getSkuImages(skuId: number): Promise<SkuImage[]> {
    return this.request<SkuImage[]>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}/file`),
    )
  }

  async createSkuImage(skuId: number, data: CreateSkuImage): Promise<SkuImage> {
    return this.request<SkuImage>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}/file`),
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    )
  }

  // Pricing

  async getPrice(skuId: number): Promise<Price | null> {
    try {
      return await this.request<Price>(this.pricingUrl(`/prices/${skuId}`))
    } catch (error) {
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  async setPrice(skuId: number, data: SetPrice): Promise<void> {
    return this.request<void>(this.pricingUrl(`/prices/${skuId}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Logistics

  async getWarehouses(): Promise<Warehouse[]> {
    return this.request<Warehouse[]>(this.logisticsUrl('/pvt/configuration/warehouses'))
  }

  async getInventory(skuId: number, warehouseId: string): Promise<Inventory> {
    return this.request<Inventory>(
      this.logisticsUrl(`/pvt/inventory/skus/${skuId}/warehouses/${warehouseId}`),
    )
  }

  async updateInventory(
    skuId: number,
    warehouseId: string,
    data: UpdateInventory,
  ): Promise<void> {
    return this.request<void>(
      this.logisticsUrl(`/pvt/inventory/skus/${skuId}/warehouses/${warehouseId}`),
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    )
  }

  // Collections

  async getCollections(from: number, to: number): Promise<Collection[]> {
    return this.request<Collection[]>(
      this.catalogUrl(`/pvt/collection/search/${from}/${to}`),
    )
  }

  async createCollection(data: CreateCollection): Promise<Collection> {
    return this.request<Collection>(this.catalogUrl('/pvt/collection'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getCollectionProducts(collectionId: number): Promise<number[]> {
    interface CollectionProductsResponse {
      Data: Array<{ SkuId: number }>
    }
    const response = await this.request<CollectionProductsResponse>(
      this.catalogUrl(`/pvt/collection/${collectionId}/products`),
    )
    return response.Data.map((item) => item.SkuId)
  }

  async addSkuToCollection(collectionId: number, skuId: number): Promise<void> {
    return this.request<void>(
      this.catalogUrl(`/pvt/collection/${collectionId}/products`),
      {
        method: 'POST',
        body: JSON.stringify({ SkuId: skuId }),
      },
    )
  }
}
