// Types for Cardmarket export data files

export interface ExportMetadata {
  version: number;
  createdAt: string;
}

export interface PriceGuideEntry {
  idProduct: number;
  idCategory: number;
  avg: number;
  low: number;
  trend: number;
  avg1: number;
  avg7: number;
  avg30: number;
  'avg-foil': number | null;
  'low-foil': number | null;
  'trend-foil': number | null;
  'avg1-foil': number | null;
  'avg7-foil': number | null;
  'avg30-foil': number | null;
}

export interface PriceGuideExport extends ExportMetadata {
  priceGuides: PriceGuideEntry[];
}

export interface ProductEntry {
  idProduct: number;
  name: string;
  idCategory: number;
  categoryName: string;
  idExpansion: number;
  idMetacard: number;
  dateAdded: string;
}

export interface ProductsExport extends ExportMetadata {
  products: ProductEntry[];
}

export interface ExportSearchResult {
  product: ProductEntry;
  priceGuide?: PriceGuideEntry;
}

export interface ExportDataStatus {
  productsLoaded: boolean;
  priceGuideLoaded: boolean;
  productsDate?: Date;
  priceGuideDate?: Date;
  productsAge?: number; // in hours
  priceGuideAge?: number; // in hours
  needsUpdate: boolean;
}
