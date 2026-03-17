import { describe, it, expect } from 'vitest'
import { IdMap } from './id-map.js'

describe('IdMap', () => {
  describe('set/get', () => {
    it('stores and retrieves a mapping', () => {
      const idMap = new IdMap()
      idMap.set('category', 1, 100)
      expect(idMap.get('category', 1)).toBe(100)
    })

    it('returns undefined for unknown entity', () => {
      const idMap = new IdMap()
      expect(idMap.get('category', 99)).toBeUndefined()
    })

    it('returns undefined for unknown id within known entity', () => {
      const idMap = new IdMap()
      idMap.set('category', 1, 100)
      expect(idMap.get('category', 2)).toBeUndefined()
    })

    it('overwrites existing mapping', () => {
      const idMap = new IdMap()
      idMap.set('brand', 1, 10)
      idMap.set('brand', 1, 20)
      expect(idMap.get('brand', 1)).toBe(20)
    })

    it('different entities are independent', () => {
      const idMap = new IdMap()
      idMap.set('category', 1, 100)
      idMap.set('brand', 1, 200)
      expect(idMap.get('category', 1)).toBe(100)
      expect(idMap.get('brand', 1)).toBe(200)
    })
  })

  describe('getOrThrow', () => {
    it('returns id when found', () => {
      const idMap = new IdMap()
      idMap.set('product', 5, 50)
      expect(idMap.getOrThrow('product', 5)).toBe(50)
    })

    it('throws descriptive error when not found', () => {
      const idMap = new IdMap()
      expect(() => idMap.getOrThrow('product', 99)).toThrow(
        'No mapping found for product with oldId=99',
      )
    })
  })

  describe('summary', () => {
    it('returns empty object when no mappings', () => {
      const idMap = new IdMap()
      expect(idMap.summary()).toEqual({})
    })

    it('counts entries per entity type', () => {
      const idMap = new IdMap()
      idMap.set('category', 1, 100)
      idMap.set('category', 2, 200)
      idMap.set('brand', 1, 10)
      expect(idMap.summary()).toEqual({ category: 2, brand: 1 })
    })

    it('does not increment count when overwriting existing id', () => {
      const idMap = new IdMap()
      idMap.set('sku', 1, 10)
      idMap.set('sku', 1, 20)
      expect(idMap.summary()).toEqual({ sku: 1 })
    })
  })
})
