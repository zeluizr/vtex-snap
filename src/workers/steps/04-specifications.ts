import type { IdMap } from '../../lib/id-map.js'
import type { VtexClient } from '../../lib/vtex-client.js'
import type { EmitFn } from '../types.js'

export async function cloneSpecifications(
  source: VtexClient,
  target: VtexClient,
  idMap: IdMap,
  emit: EmitFn,
): Promise<void> {
  const step = 'specifications'
  console.log('[step:specifications] starting')

  const categoryIds: Array<[number, number]> = [] // [oldId, newId]

  const sourceTree = await source.getCategoryTree(3)
  const flatSourceCats: number[] = []
  function collectIds(cats: typeof sourceTree) {
    for (const c of cats) {
      flatSourceCats.push(c.Id)
      if (c.Children) collectIds(c.Children)
    }
  }
  collectIds(sourceTree)

  for (const oldCatId of flatSourceCats) {
    const newCatId = idMap.get('category', oldCatId)
    if (newCatId !== undefined) {
      categoryIds.push([oldCatId, newCatId])
    }
  }

  let totalFields = 0
  const allGroupsAndFields: Array<{
    oldCatId: number
    newCatId: number
    groups: Awaited<ReturnType<VtexClient['getSpecificationGroups']>>
    fields: Awaited<ReturnType<VtexClient['getSpecificationFields']>>
  }> = []

  for (const [oldCatId, newCatId] of categoryIds) {
    try {
      const groups = await source.getSpecificationGroups(oldCatId)
      const fields = await source.getSpecificationFields(oldCatId)
      totalFields += fields.length
      allGroupsAndFields.push({ oldCatId, newCatId, groups, fields })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(`[step:specifications] could not fetch specs for category ${oldCatId}: ${message}`)
    }
  }

  emit({ type: 'step:start', step, total: totalFields })

  let created = 0
  let errors = 0
  let current = 0

  for (const { oldCatId, newCatId, groups, fields } of allGroupsAndFields) {
    // Create groups first
    for (const group of groups) {
      try {
        const newGroup = await target.createSpecificationGroup({
          CategoryId: newCatId,
          Name: group.Name,
          Position: group.Position,
        })
        idMap.set('specGroup', group.Id, newGroup.Id)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[step:specifications] error creating group ${group.Id}: ${message}`)
      }
    }

    // Create fields
    for (const field of fields) {
      current++
      try {
        const newGroupId = idMap.get('specGroup', field.FieldGroupId) ?? field.FieldGroupId

        const newField = await target.createSpecificationField({
          CategoryId: newCatId,
          FieldGroupId: newGroupId,
          Name: field.Name,
          Description: field.Description ?? '',
          IsActive: field.IsActive,
          IsRequired: field.IsRequired,
          IsFilter: field.IsFilter,
          IsOnProductDetails: field.IsOnProductDetails,
          IsInternal: field.IsInternal,
          IsTopMenuLinkActive: field.IsTopMenuLinkActive,
          IsSideMenuLinkActive: field.IsSideMenuLinkActive,
          IsStockKeepingUnit: field.IsStockKeepingUnit,
          FieldTypeName: field.FieldTypeName,
          FieldTypeId: field.FieldTypeId,
          IsRange: field.IsRange,
          IsSearchable: field.IsSearchable,
          MaxCaracters: field.MaxCaracters,
          AllowedValues: field.AllowedValues?.map((v) => v.Name) ?? [],
          Position: field.Position,
        })

        idMap.set('specField', field.Id, newField.Id)
        created++

        emit({
          type: 'step:progress',
          step,
          current,
          total: totalFields,
          detail: `[cat:${oldCatId}] ${field.Name}`,
        })
      } catch (error) {
        errors++
        const message = error instanceof Error ? error.message : String(error)
        console.error(`[step:specifications] error creating field ${field.Id}: ${message}`)
        emit({
          type: 'step:error',
          step,
          message: `Failed to clone spec field "${field.Name}" in category ${oldCatId}`,
          detail: message,
        })
      }
    }
  }

  emit({ type: 'step:complete', step, created, errors })
  console.log(`[step:specifications] done: created=${created}, errors=${errors}`)
}
