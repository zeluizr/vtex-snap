import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'

export interface ProductSkuMapping {
  oldProductId: number
  newProductId: number
  skuIds: number[]
}

export async function cloneProducts(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
): Promise<ProductSkuMapping[]> {
  const step = 'products'
  console.log('[step:products] starting')

  const sourceTree = await source.getCategoryTree(3)
  const categoryIds: number[] = []
  function collectIds(cats: typeof sourceTree) {
    for (const c of cats) {
      categoryIds.push(c.Id)
      if (c.Children) collectIds(c.Children)
    }
  }
  collectIds(sourceTree)

  // First pass: count all products
  let totalProducts = 0
  const productIdsByCat: Array<{ catId: number; productIds: number[]; skuIdsBypProduct: Record<number, number[]> }> = []

  for (const catId of categoryIds) {
    if (!idMap.get('category', catId)) continue

    const allProductIds: number[] = []
    const skuIdsByProduct: Record<number, number[]> = {}
    let from = 0
    const pageSize = 50

    try {
      while (true) {
        const result = await source.getProductAndSkuIds(catId, from, from + pageSize - 1)
        const entries = Object.entries(result.data)
        if (entries.length === 0) break

        for (const [productId, skuIds] of entries) {
          const pid = parseInt(productId, 10)
          allProductIds.push(pid)
          skuIdsByProduct[pid] = skuIds
        }

        from += pageSize
        if (from >= result.range.total) break
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[step:products] could not fetch products for category ${catId}: ${message}`)
    }

    totalProducts += allProductIds.length
    productIdsByCat.push({ catId, productIds: allProductIds, skuIdsBypProduct: skuIdsByProduct })
  }

  emit({ type: 'step:start', step, total: totalProducts })

  let created = 0
  let errors = 0
  let current = 0
  const mappings: ProductSkuMapping[] = []

  for (const { catId, productIds, skuIdsBypProduct } of productIdsByCat) {
    const newCatId = idMap.getOrThrow('category', catId)

    for (const oldProductId of productIds) {
      current++
      try {
        const product = await source.getProduct(oldProductId)
        const newBrandId = idMap.get('brand', product.BrandId) ?? product.BrandId

        const newProduct = await target.createProduct({
          Name: product.Name,
          DepartmentId: newCatId,
          CategoryId: newCatId,
          BrandId: newBrandId,
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
          CubicWeight: product.CubicWeight ?? 0,
          AdWordsRemarketingCode: product.AdWordsRemarketingCode ?? '',
          LomadeeCampaignCode: product.LomadeeCampaignCode ?? '',
        })

        idMap.set('product', oldProductId, newProduct.Id)
        created++
        mappings.push({
          oldProductId,
          newProductId: newProduct.Id,
          skuIds: skuIdsBypProduct[oldProductId] ?? [],
        })

        emit({
          type: 'step:progress',
          step,
          current,
          total: totalProducts,
          detail: product.Name,
        })
      } catch (error) {
        errors++
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[step:products] error cloning product ${oldProductId}: ${message}`)
        emit({
          type: 'step:error',
          step,
          message: `Failed to clone product ${oldProductId}`,
          detail: message,
        })
      }
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:products] done: created=${created}, errors=${errors}`)
  return mappings
}
