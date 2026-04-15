import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'

export async function cloneBrands(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
): Promise<void> {
  const step = 'brands'
  console.log('[step:brands] fetching brands')

  const brands = await source.getBrands()

  emit({ type: 'step:start', step, total: brands.length })

  let created = 0
  let errors = 0

  for (let i = 0; i < brands.length; i++) {
    const brand = brands[i]!
    try {
      const newBrand = await target.createBrand({
        Name: brand.name,
        IsActive: brand.isActive,
        Title: brand.title,
        MetaTagDescription: brand.metaTagDescription,
        KeyWords: brand.keywords ?? '',
        SiteTitle: brand.siteTitle,
        Text: brand.text,
        Score: brand.score,
        MenuHome: brand.menuHome,
      })

      idMap.set('brand', brand.id, newBrand.Id)
      created++

      emit({
        type: 'step:progress',
        step,
        current: i + 1,
        total: brands.length,
        detail: brand.name,
      })
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[step:brands] error cloning brand ${brand.id}: ${message}`)
      emit({
        type: 'step:error',
        step,
        message: `Failed to clone brand "${brand.name}"`,
        detail: message,
      })
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:brands] done: created=${created}, errors=${errors}`)
}
