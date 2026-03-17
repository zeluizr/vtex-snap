import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { Category, EmitFn } from '../types.js'

function flattenTree(categories: Category[]): Category[] {
  const result: Category[] = []
  function walk(nodes: Category[]) {
    for (const node of nodes) {
      result.push(node)
      if (node.Children && node.Children.length > 0) {
        walk(node.Children)
      }
    }
  }
  walk(categories)
  return result
}

export async function cloneCategories(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
): Promise<void> {
  const step = 'categories'
  console.log('[step:categories] fetching category tree')

  const tree = await source.getCategoryTree(3)
  const flat = flattenTree(tree)

  emit({ type: 'step:start', step, total: flat.length })

  let created = 0
  let errors = 0

  for (let i = 0; i < flat.length; i++) {
    const cat = flat[i]!
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
        total: flat.length,
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
