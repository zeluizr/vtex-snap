// VTEX API Types

export interface BrandListItem {
  id: number
  name: string
  isActive: boolean
  title: string
  metaTagDescription: string
  imageUrl: string | null
}

export interface BrandDetail {
  id: number
  name: string
  isActive: boolean
  title: string
  metaTagDescription: string
  imageUrl: string | null
}

export interface CategoryWithTreePath {
  Id: number
  Name: string
  FatherCategoryId: number | null
  Title: string
  Description: string
  Keywords: string
  IsActive: boolean
  TreePath: string[] | null
  TreePathIds: number[] | null
  TreePathLinkIds: string[] | null
}

export interface Product {
  Id: number
  Name: string
  DepartmentId: number
  CategoryId: number
  BrandId: number
  LinkId: string
  RefId: string
  IsVisible: boolean
  Description: string
  DescriptionShort: string
  ReleaseDate: string
  KeyWords: string
  Title: string
  IsActive: boolean
  TaxCode: string
  MetaTagDescription: string
  SupplierId: number | null
  ShowWithoutStock: boolean
  Score: number | null
  CubicWeight: number
  AdWordsRemarketingCode: string
  LomadeeCampaignCode: string
}

// Product creation: uses CategoryPath + BrandName so VTEX auto-creates
// the category tree and brand on the destination if they do not exist.
export interface CreateProduct {
  Id?: number
  Name: string
  CategoryPath: string
  BrandName: string
  DepartmentId?: number
  LinkId?: string
  RefId?: string
  IsVisible?: boolean
  Description?: string
  DescriptionShort?: string
  ReleaseDate?: string
  KeyWords?: string
  Title?: string
  IsActive?: boolean
  TaxCode?: string
  MetaTagDescription?: string
  SupplierId?: number | null
  ShowWithoutStock?: boolean
  Score?: number | null
}

export interface Sku {
  Id: number
  ProductId: number
  IsActive: boolean
  Name: string
  RefId: string
  PackagedHeight: number
  PackagedLength: number
  PackagedWidth: number
  PackagedWeightKg: number
  Height: number | null
  Length: number | null
  Width: number | null
  WeightKg: number | null
  CubicWeight: number
  IsKit: boolean
  CreationDate: string
  RewardValue: number | null
  EstimatedDateArrival: string | null
  ManufacturerCode: string
  CommercialConditionId: number
  MeasurementUnit: string
  UnitMultiplier: number
  ModalType: string
  KitItensSellApart: boolean
  Videos: string[]
  ActivateIfPossible: boolean
}

export interface CreateSku {
  Id?: number
  ProductId: number
  IsActive: boolean
  Name: string
  RefId: string
  PackagedHeight: number
  PackagedLength: number
  PackagedWidth: number
  PackagedWeightKg: number
  Height: number | null
  Length: number | null
  Width: number | null
  WeightKg: number | null
  CubicWeight: number
  IsKit: boolean
  RewardValue: number | null
  EstimatedDateArrival: string | null
  ManufacturerCode: string
  CommercialConditionId: number
  MeasurementUnit: string
  UnitMultiplier: number
  ModalType: string
  KitItensSellApart: boolean
  Videos: string[]
  ActivateIfPossible: boolean
}

// Subset of fields returned by GET /api/catalog_system/pvt/sku/stockkeepingunitbyid/{skuId}
// Consumed by discovery, products, skus and spec-values steps.
export interface SkuContextSpec {
  FieldId: number
  FieldName: string
  FieldValueIds: number[]
  FieldValues: string[]
  FieldGroupId?: number
  FieldGroupName?: string
}

export interface SkuContextDimension {
  cubicweight: number
  height: number
  length: number
  weight: number
  width: number
}

export interface SkuContextRealDimension {
  realCubicWeight: number
  realHeight: number
  realLength: number
  realWeight: number
  realWidth: number
}

export interface SkuContextAlternateIds {
  Ean?: string
  RefId?: string
}

export interface SkuContext {
  Id: number
  ProductId: number
  SkuName: string
  IsActive: boolean
  IsKit: boolean
  BrandName: string
  Dimension: SkuContextDimension
  RealDimension: SkuContextRealDimension
  ManufacturerCode: string
  CommercialConditionId: number
  MeasurementUnit: string
  UnitMultiplier: number
  ModalType: string | null
  RewardValue: number | null
  EstimatedDateArrival: string | null
  AlternateIds: SkuContextAlternateIds
  Videos: string[]
  ProductSpecifications: SkuContextSpec[]
  SkuSpecifications: SkuContextSpec[]
}

// Discovery output: catalog enumerated by paginating SKU IDs and fetching each SKU's context.
export interface DiscoveredSku {
  oldSkuId: number
  context: SkuContext
}

export interface DiscoveredProduct {
  oldProductId: number
  brandName: string
  productSpecs: SkuContextSpec[]
  skus: DiscoveredSku[]
}

export type DiscoveredCatalog = Map<number, DiscoveredProduct>

// PUT /api/catalog/pvt/product/{productId}/specificationvalue
// Auto-creates group + spec + values when they do not exist on destination.
export interface SetProductSpecValue {
  FieldName: string
  GroupName: string
  RootLevelSpecification: boolean
  FieldValues: string[]
}

// PUT /api/catalog/pvt/stockkeepingunit/{skuId}/specificationvalue
export interface SetSkuSpecValue {
  FieldName: string
  GroupName: string
  RootLevelSpecification: boolean
  FieldValues: string[]
}

export interface VtexCredentials {
  accountName: string
  appKey: string
  appToken: string
  sellerId: string
}

// Clone events
export type CloneEvent =
  | { type: 'step:start'; step: string; total: number }
  | { type: 'step:progress'; step: string; current: number; total: number; detail: string }
  | { type: 'step:complete'; step: string; created: number; errors: number }
  | { type: 'step:error'; step: string; message: string; detail?: string }
  | { type: 'complete'; summary: CloneSummary }
  | { type: 'error'; message: string }

export type CloneSummary = Record<string, number>

export type EmitFn = (event: CloneEvent) => void
