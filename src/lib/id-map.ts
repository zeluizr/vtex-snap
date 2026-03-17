import type { CloneSummary } from '../workers/types.js'

type EntityName = 'category' | 'brand' | 'product' | 'sku' | 'specGroup' | 'specField' | 'collection'

export class IdMap {
  private maps: Map<string, Map<number, number>> = new Map()

  set(entity: EntityName, oldId: number, newId: number): void {
    if (!this.maps.has(entity)) {
      this.maps.set(entity, new Map())
    }
    this.maps.get(entity)!.set(oldId, newId)
  }

  get(entity: EntityName, oldId: number): number | undefined {
    return this.maps.get(entity)?.get(oldId)
  }

  getOrThrow(entity: EntityName, oldId: number): number {
    const id = this.get(entity, oldId)
    if (id === undefined) {
      throw new Error(`No mapping found for ${entity} with oldId=${oldId}`)
    }
    return id
  }

  summary(): CloneSummary {
    const result: CloneSummary = {}
    for (const [entity, map] of this.maps.entries()) {
      result[entity] = map.size
    }
    return result
  }
}
