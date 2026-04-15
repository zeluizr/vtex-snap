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
// We only consume specifications.
export interface SkuContextSpec {
  FieldId: number
  FieldName: string
  FieldValueIds: number[]
  FieldValues: string[]
  FieldGroupId?: number
  FieldGroupName?: string
}

export interface SkuContext {
  Id: number
  ProductId: number
  ProductSpecifications: SkuContextSpec[]
  SkuSpecifications: SkuContextSpec[]
}

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
