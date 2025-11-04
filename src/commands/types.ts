// Shared TypeScript types for the Cardmarket CLI

export interface Config {
  credentials?: Credentials;
  preferences: Preferences;
  cache: CacheConfig;
  export: ExportConfig;
}

export interface Credentials {
  appToken: string;
  appSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

export interface Preferences {
  country: string;
  currency: string;
  language: string;
  maxResults: number;
  defaultSort?: ExportSortOption;
  hideFoil?: boolean;
  showPerBooster?: boolean;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
}

export interface ExportConfig {
  enabled: boolean;
  autoUpdate: boolean;
}

export interface SearchOptions {
  condition?: CardCondition;
  foil?: boolean;
  signed?: boolean;
  altered?: boolean;
  language?: string;
  set?: string;
  minPrice?: number;
  maxPrice?: number;
  includeShipping?: boolean;
  filterCountry?: boolean;
  top?: number;
  groupBySeller?: boolean;
  sort?: SortOption;
  json?: boolean;
  noCache?: boolean;
  maxResults?: number;
  live?: boolean; // Force API usage instead of export data
  showFoil?: boolean; // Override hideFoil preference to show foil column
  hidePerBooster?: boolean; // Override showPerBooster preference to hide per-booster column
}

export type CardCondition = 'MT' | 'NM' | 'EX' | 'GD' | 'LP' | 'PL' | 'PO';
export type SortOption = 'price' | 'condition' | 'seller-rating';
export type ExportSortOption = 'trend' | 'low' | 'avg' | 'name' | 'none';

// API Response Types

export interface ProductSearchResponse {
  product: Product[];
}

export interface Product {
  idProduct: number;
  name: string;
  categoryName: string;
  expansionName: string;
  number?: string;
  rarity?: string;
  image?: string;
  website?: string;
  countReprints?: number;
  priceGuide?: PriceGuide;
  expansion?: Expansion;
}

export interface PriceGuide {
  SELL: number;
  LOW: number;
  LOWEX: number;
  AVG: number;
  TREND: number;
}

export interface Expansion {
  idExpansion: number;
  expansionName: string;
  abbreviation: string;
  icon: number;
  releaseDate: string;
}

export interface ArticleSearchResponse {
  article: Article[];
}

export interface Article {
  idArticle: number;
  idProduct: number;
  language: Language;
  count: number;
  price: number;
  condition: CardCondition;
  isFoil: boolean;
  isSigned: boolean;
  isAltered: boolean;
  isPlayset: boolean;
  seller: Seller;
  comments?: string;
}

export interface Language {
  idLanguage: number;
  languageName: string;
}

export interface Seller {
  idUser: number;
  username: string;
  country: string;
  isCommercial: boolean;
  reputation: number;
  shipsFast?: boolean;
  sellCount?: number;
  onVacation: boolean;
  riskGroup?: number;
}

export interface ShippingMethod {
  idShippingMethod: number;
  name: string;
  price: number;
  isLetter: boolean;
  isInsured: boolean;
}

// Enriched types for display

export interface EnrichedArticle extends Article {
  productName?: string;
  expansionName?: string;
  shippingCost?: number;
  totalCost?: number;
  shipsToCountry?: boolean;
}

export interface SearchResult {
  product: Product;
  articles: EnrichedArticle[];
  bestOffer?: EnrichedArticle;
}

// Cache entry

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// Error types

export class CardmarketAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'CardmarketAPIError';
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}
