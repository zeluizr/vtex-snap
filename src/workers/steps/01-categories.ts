import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { Category, EmitFn } from '../types.js'

export function orderByHierarchy(categories: Category[]): Category[] {
  const remaining = new Map<number, Category>()
  for (const c of categories) remaining.set(c.Id, c)

  const ordered: Category[] = []
  const placed = new Set<number>()

  let progressed = true
  while (remaining.size > 0 && progressed) {
    progressed = false
    for (const [id, cat] of remaining) {
      const parentReady =
        cat.FatherCategoryId === null ||
        !remaining.has(cat.FatherCategoryId) ||
        placed.has(cat.FatherCategoryId)
      if (parentReady) {
        ordered.push(cat)
        placed.add(id)
        remaining.delete(id)
        progressed = true
      }
    }
  }

  // Append any leftovers (shouldn't happen, but defensive)
  for (const cat of remaining.values()) ordered.push(cat)

  return ordered
}

export async function cloneCategories(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
  categoryIds: number[],
): Promise<void> {
  const step = 'categories'
  console.log(`[step:categories] fetching ${categoryIds.length} category IDs`)

  const fetched: Category[] = []
  for (const id of categoryIds) {
    const cat = await source.getCategoryByIdSafe(id)
    if (cat) fetched.push(cat)
  }

  console.log(`[step:categories] found ${fetched.length} categories`)

  const ordered = orderByHierarchy(fetched)

  emit({ type: 'step:start', step, total: ordered.length })

  let created = 0
  let errors = 0

  for (let i = 0; i < ordered.length; i++) {
    const cat = ordered[i]!
    try {
      const newFatherCategoryId =
        cat.FatherCategoryId !== null
          ? (idMap.get('category', cat.FatherCategoryId) ?? null)
          : null

      const newCat = await target.createCategory({
        Name: cat.Name,
        FatherCategoryId: newFatherCategoryId,
        Title: cat.Title,
        Description: cat.Description,
        Keywords: cat.Keywords,
        IsActive: cat.IsActive,
        LomadeeCampaignCode: cat.LomadeeCampaignCode,
        AdWordsRemarketingCode: cat.AdWordsRemarketingCode,
        ShowInStoreFront: cat.ShowInStoreFront,
        ShowBrandFilter: cat.ShowBrandFilter,
        ActiveStoreFrontLink: cat.ActiveStoreFrontLink,
        GlobalCategoryId: cat.GlobalCategoryId,
        StockKeepingUnitSelectionMode: cat.StockKeepingUnitSelectionMode,
        Score: cat.Score,
      })

      idMap.set('category', cat.Id, newCat.Id)
      created++

      emit({
        type: 'step:progress',
        step,
        current: i + 1,
        total: ordered.length,
        detail: cat.Name,
      })
    } catch (error) {
      errors++
      const message = error instanceof Error ? error.message : String(error)
      console.error(`[step:categories] error cloning category ${cat.Id}: ${message}`)
      emit({
        type: 'step:error',
        step,
        message: `Failed to clone category "${cat.Name}"`,
        detail: message,
      })
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:categories] done: created=${created}, errors=${errors}`)
}
