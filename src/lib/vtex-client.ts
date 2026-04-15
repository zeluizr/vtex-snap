import type {
  BrandDetail,
  BrandListItem,
  CategoryWithTreePath,
  CreateProduct,
  CreateSku,
  Product,
  SetProductSpecValue,
  SetSkuSpecValue,
  Sku,
  SkuContext,
} from '../workers/types.js'
import { throttle } from './throttle.js'

interface VtexClientConfig {
  accountName: string
  appKey: string
  appToken: string
}

const REQUEST_TIMEOUT_MS = 30000
const MAX_RETRIES = 3

export function isConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes('HTTP 409')
}

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
      } catch (error) {
        if (retries > 0) {
          const waitMs = (MAX_RETRIES - retries + 1) * 1000
          await new Promise((resolve) => setTimeout(resolve, waitMs))
          return this.request<T>(url, options, retries - 1)
        }
        throw error
      } finally {
        clearTimeout(timeoutId)
      }

      if (response.status === 429 && retries > 0) {
        const retryAfter = response.headers.get('Retry-After')
        const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 30000
        // Pause every other in-flight + future request so we don't immediately retrigger.
        throttle.cooldown(waitMs)
        await new Promise((resolve) => setTimeout(resolve, waitMs))
        return this.request<T>(url, options, retries - 1)
      }

      if ((response.status === 502 || response.status === 503 || response.status === 504) && retries > 0) {
        const waitMs = (MAX_RETRIES - retries + 1) * 2000
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

  // Preflight (lightweight auth check)

  async getBrands(): Promise<BrandListItem[]> {
    return this.request<BrandListItem[]>(this.catalogSystemUrl('/pvt/brand/list'))
  }

  // Categories — only used to resolve TreePath for product cloning

  async getCategoryWithTreePath(id: number): Promise<CategoryWithTreePath> {
    return this.request<CategoryWithTreePath>(
      this.catalogUrl(`/pvt/category/${id}?includeTreePath=true`),
    )
  }

  // Brands — only used to resolve brand name for product cloning

  async getBrand(id: number): Promise<BrandDetail> {
    return this.request<BrandDetail>(this.catalogSystemUrl(`/pvt/brand/${id}`))
  }

  // Products

  async getProduct(productId: number): Promise<Product> {
    return this.request<Product>(this.catalogUrl(`/pvt/product/${productId}`))
  }

  async getProductSafe(productId: number): Promise<Product | null> {
    try {
      return await this.getProduct(productId)
    } catch (error) {
      if (error instanceof Error && error.message.includes('HTTP 404')) {
        return null
      }
      throw error
    }
  }

  async createProduct(data: CreateProduct): Promise<Product> {
    return this.request<Product>(this.catalogUrl('/pvt/product'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateProduct(productId: number, data: CreateProduct): Promise<Product> {
    return this.request<Product>(this.catalogUrl(`/pvt/product/${productId}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // Upsert: create on destination; if VTEX rejects with 409 (Id already exists), update instead.
  async upsertProduct(
    data: CreateProduct,
  ): Promise<{ product: Product; mode: 'created' | 'updated' }> {
    try {
      const product = await this.createProduct(data)
      return { product, mode: 'created' }
    } catch (error) {
      if (isConflict(error) && data.Id !== undefined) {
        const product = await this.updateProduct(data.Id, data)
        return { product, mode: 'updated' }
      }
      throw error
    }
  }

  // SKUs

  async getSkuContext(skuId: number): Promise<SkuContext> {
    return this.request<SkuContext>(
      this.catalogSystemUrl(`/pvt/sku/stockkeepingunitbyid/${skuId}`),
    )
  }

  async getSkuContextSafe(skuId: number): Promise<SkuContext | null> {
    try {
      return await this.getSkuContext(skuId)
    } catch (error) {
      if (error instanceof Error) {
        const msg = error.message
        if (
          msg.includes('HTTP 404') ||
          msg.includes('HTTP 502') ||
          msg.includes('HTTP 503') ||
          msg.includes('HTTP 504')
        ) {
          return null
        }
      }
      throw error
    }
  }

  async getSkuIds(page: number, pageSize: number): Promise<number[]> {
    return this.request<number[]>(
      this.catalogSystemUrl(`/pvt/sku/stockkeepingunitids?page=${page}&pagesize=${pageSize}`),
    )
  }

  async createSku(data: CreateSku): Promise<Sku> {
    return this.request<Sku>(this.catalogUrl('/pvt/stockkeepingunit'), {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateSku(skuId: number, data: CreateSku): Promise<Sku> {
    return this.request<Sku>(this.catalogUrl(`/pvt/stockkeepingunit/${skuId}`), {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async upsertSku(data: CreateSku): Promise<{ sku: Sku; mode: 'created' | 'updated' }> {
    try {
      const sku = await this.createSku(data)
      return { sku, mode: 'created' }
    } catch (error) {
      if (isConflict(error) && data.Id !== undefined) {
        const sku = await this.updateSku(data.Id, data)
        return { sku, mode: 'updated' }
      }
      throw error
    }
  }

  async activateSku(skuId: number): Promise<void> {
    return this.request<void>(this.catalogUrl(`/pvt/stockkeepingunit/${skuId}`), {
      method: 'PUT',
      body: JSON.stringify({ IsActive: true }),
    })
  }

  // Specification values — auto-creates group + spec + values when not present

  async setProductSpecValue(productId: number, data: SetProductSpecValue): Promise<void> {
    return this.request<void>(
      this.catalogUrl(`/pvt/product/${productId}/specificationvalue`),
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    )
  }

  async setSkuSpecValue(skuId: number, data: SetSkuSpecValue): Promise<void> {
    return this.request<void>(
      this.catalogUrl(`/pvt/stockkeepingunit/${skuId}/specificationvalue`),
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    )
  }
}
