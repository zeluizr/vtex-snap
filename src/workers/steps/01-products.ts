import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'

export interface ProductSkuMapping {
  oldProductId: number
  newProductId: number
}

export async function cloneProducts(
  source: VtexClient,
  target: VtexClient,
  emit: EmitFn,
  productIdFrom: number,
  productIdTo: number,
): Promise<ProductSkuMapping[]> {
  const step = 'products'
  const total = productIdTo - productIdFrom + 1
  console.log(`[step:products] scanning product IDs ${productIdFrom}..${productIdTo}`)

  emit({ type: 'step:start', step, total })

  let created = 0
  let errors = 0
  let scanned = 0
  const mappings: ProductSkuMapping[] = []

  // Cached resolutions for category path and brand name (many products share these).
  const categoryPathCache = new Map<number, string>()
  const brandNameCache = new Map<number, string>()

  const resolveCategoryPath = async (categoryId: number): Promise<string> => {
    const cached = categoryPathCache.get(categoryId)
    if (cached !== undefined) return cached
    const cat = await source.getCategoryWithTreePath(categoryId)
    const path = cat.TreePath && cat.TreePath.length > 0 ? cat.TreePath.join('/') : cat.Name
    categoryPathCache.set(categoryId, path)
    return path
  }

  const resolveBrandName = async (brandId: number): Promise<string> => {
    const cached = brandNameCache.get(brandId)
    if (cached !== undefined) return cached
    const brand = await source.getBrand(brandId)
    brandNameCache.set(brandId, brand.name)
    return brand.name
  }

  for (let id = productIdFrom; id <= productIdTo; id++) {
    scanned++
    const product = await source.getProductSafe(id)
    if (!product) {
      emit({
        type: 'step:progress',
        step,
        current: scanned,
        total,
        detail: `skip ${id} (não encontrado)`,
      })
      continue
    }

    try {
      const [categoryPath, brandName] = await Promise.all([
        resolveCategoryPath(product.CategoryId),
        resolveBrandName(product.BrandId),
      ])

      const newProduct = await target.createProduct({
        Id: product.Id,
        Name: product.Name,
        CategoryPath: categoryPath,
        BrandName: brandName,
        DepartmentId: product.DepartmentId,
        LinkId: product.LinkId,
        RefId: product.RefId,
        IsVisible: product.IsVisible,
        Description: product.Description ?? '',
        DescriptionShort: product.DescriptionShort ?? '',
        ReleaseDate: product.ReleaseDate,
        KeyWords: product.KeyWords ?? '',
        Title: product.Title ?? product.Name,
        IsActive: product.IsActive,
        TaxCode: product.TaxCode ?? '',
        MetaTagDescription: product.MetaTagDescription ?? '',
        SupplierId: product.SupplierId,
        ShowWithoutStock: product.ShowWithoutStock,
        Score: product.Score,
      })

      created++
      mappings.push({ oldProductId: product.Id, newProductId: newProduct.Id })

      emit({
        type: 'step:progress',
        step,
        current: scanned,
        total,
        detail: `${product.Id} → ${newProduct.Id} ${product.Name}`,
      })
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[step:products] error cloning product ${product.Id}: ${message}`)
      emit({
        type: 'step:error',
        step,
        message: `Failed to clone product ${product.Id}`,
        detail: message,
      })
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:products] done: created=${created}, errors=${errors}`)
  return mappings
}
