// VTEX API Types

export interface CategoryTreeNode {
  Id: number
  Name: string
  HasChildren: boolean
  Url: string
  Children: CategoryTreeNode[]
}

export interface BrandListItem {
  id: number
  name: string
  isActive: boolean
  title: string
  metaTagDescription: string
  imageUrl: string | null
  keywords: string
  siteTitle: string
  text: string
  score: number | null
  menuHome: boolean
  linkId: string
}

export interface Category {
  Id: number
  Name: string
  FatherCategoryId: number | null
  Title: string
  Description: string
  Keywords: string
  IsActive: boolean
  LomadeeCampaignCode: string
  AdWordsRemarketingCode: string
  ShowInStoreFront: boolean
  ShowBrandFilter: boolean
  ActiveStoreFrontLink: boolean
  GlobalCategoryId: number
  StockKeepingUnitSelectionMode: string
  Score: number | null
  LinkId: string
  HasChildren: boolean
  Children?: Category[]
}

export interface CreateCategory {
  Name: string
  FatherCategoryId: number | null
  Title: string
  Description: string
  Keywords: string
  IsActive: boolean
  LomadeeCampaignCode: string
  AdWordsRemarketingCode: string
  ShowInStoreFront: boolean
  ShowBrandFilter: boolean
  ActiveStoreFrontLink: boolean
  GlobalCategoryId: number
  StockKeepingUnitSelectionMode: string
  Score: number | null
}

export interface Brand {
  Id: number
  Name: string
  IsActive: boolean
  Title: string
  MetaTagDescription: string
  ImageUrl: string | null
  KeyWords: string
  SiteTitle: string
  Text: string
  Score: number | null
  MenuHome: boolean
  LinkId: string
  Keywords: string
}

export interface CreateBrand {
  Name: string
  IsActive: boolean
  Title: string
  MetaTagDescription: string
  KeyWords: string
  SiteTitle: string
  Text: string
  Score: number | null
  MenuHome: boolean
}

export interface TradePolicy {
  Id: number
  Name: string
}

export interface SpecGroup {
  Id: number
  CategoryId: number
  Name: string
  Position: number
}

export interface CreateSpecGroup {
  CategoryId: number
  Name: string
  Position: number
}

export interface SpecField {
  Id: number
  CategoryId: number
  FieldGroupId: number
  Name: string
  Description: string
  IsActive: boolean
  IsRequired: boolean
  IsFilter: boolean
  IsOnProductDetails: boolean
  IsInternal: boolean
  IsTopMenuLinkActive: boolean
  IsSideMenuLinkActive: boolean
  IsStockKeepingUnit: boolean
  FieldTypeName: string
  FieldTypeId: number
  IsRange: boolean
  IsSearchable: boolean
  MaxCaracters: number
  AllowedValues: SpecValue[]
  FieldValues: string[]
  Position: number
  RawSpecValues: string[]
}

export interface SpecValue {
  Id: number
  FieldId: number
  Name: string
  IsActive: boolean
  Position: number
}

export interface CreateSpecField {
  CategoryId: number
  FieldGroupId: number
  Name: string
  Description: string
  IsActive: boolean
  IsRequired: boolean
  IsFilter: boolean
  IsOnProductDetails: boolean
  IsInternal: boolean
  IsTopMenuLinkActive: boolean
  IsSideMenuLinkActive: boolean
  IsStockKeepingUnit: boolean
  FieldTypeName: string
  FieldTypeId: number
  IsRange: boolean
  IsSearchable: boolean
  MaxCaracters: number
  AllowedValues: string[]
  Position: number
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

export interface CreateProduct {
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

export interface ProductAndSkuIds {
  data: Record<string, number[]>
  range: {
    total: number
    from: number
    to: number
  }
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
  EAN: string[]
  Specifications: SkuSpecEntry[]
  Images: SkuImage[]
  ActivateIfPossible: boolean
}

export interface CreateSku {
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

export interface SkuImage {
  Id: number
  SkuId: number
  Name: string
  IsMain: boolean
  Label: string | null
  Url: string
  ImageInserted: boolean
}

export interface CreateSkuImage {
  Url: string
  Name: string
  IsMain: boolean
  Label?: string
}

export interface ProductSpec {
  Id: number
  Name: string
  Value: string[]
}

export interface SetProductSpec {
  Id: number
  Value: string[]
}

export interface SkuSpec {
  Id: number
  SkuId: number
  FieldId: number
  FieldName: string
  FieldValueId: number
  FieldValueName: string
}

export interface SkuSpecEntry {
  FieldId: number
  FieldValueId: number[]
}

export interface SetSkuSpec {
  FieldId: number
  FieldValueId: number[]
}

export interface Price {
  itemId: string
  listPrice: number | null
  costPrice: number | null
  markup: number | null
  basePrice: number | null
  fixedPrices: FixedPrice[]
}

export interface FixedPrice {
  tradePolicyId: string
  value: number
  listPrice: number | null
  minQuantity: number
  dateRange: {
    from: string
    to: string
  } | null
}

export interface SetPrice {
  listPrice: number | null
  costPrice: number | null
  markup: number | null
  basePrice: number | null
  fixedPrices: FixedPrice[]
}

export interface Warehouse {
  id: string
  name: string
  warehouseDocks: WarehouseDock[]
}

export interface WarehouseDock {
  dockId: string
  time: string
  cost: number
}

export interface Inventory {
  skuId: string
  warehouseId: string
  totalQuantity: number
  reservedQuantity: number
  hasUnlimitedQuantity: boolean
  timeToRefill: string | null
  dateOfSupplyUtc: string | null
}

export interface UpdateInventory {
  unlimitedQuantity: boolean
  quantity: number
  dateUtcOnBalanceSystem?: string
}

export interface Collection {
  Id: number
  Name: string
  Description: string
  Searchable: boolean
  Highlight: boolean
  DateFrom: string
  DateTo: string
  TotalSku: number
  TotalProducts: number
}

export interface CreateCollection {
  Name: string
  Description: string
  Searchable: boolean
  Highlight: boolean
  DateFrom: string
  DateTo: string
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
