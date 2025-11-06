// Types for Expected Value (EV) calculations

export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';

export type BoosterType = 'playBooster' | 'draftBooster' | 'setBooster' | 'collectorBooster';

/**
 * Processed Scryfall card data (optimized for EV calculations)
 */
export interface ProcessedCard {
  id: string;              // Scryfall UUID
  name: string;            // Card name
  set: string;             // Set code (e.g., "BLB")
  set_name: string;        // Full set name
  rarity: Rarity;          // Card rarity
  eur: number | null;      // EUR price (null if unavailable)
  eur_foil: number | null; // Foil EUR price
  collector_number: string; // Collector number
  released_at: string;     // Release date (ISO format)
}

/**
 * Scryfall data status information
 */
export interface ScryfallDataStatus {
  downloaded: boolean;
  fileSize: number;
  lastUpdated?: Date;
  age?: number; // hours
  needsUpdate: boolean;
  cardCount: number;
}

/**
 * Expansion mapping between Cardmarket and Scryfall
 */
export interface ExpansionMapping {
  expansionId: number;     // Cardmarket expansion ID
  setCode: string;         // Scryfall set code
  setName: string;         // Set name
  confidence: number;      // 0-1 confidence score
  source: 'auto' | 'manual'; // Mapping source
}

/**
 * Booster slot configuration
 */
export interface BoosterSlot {
  type: 'rare_mythic' | 'uncommon' | 'common' | 'wildcard' | 'foil' | 'land';
  count: number;
  distribution?: Record<string, number>; // e.g., { "rare": 7, "mythic": 1 }
  special?: string;
}

/**
 * Booster pack configuration
 */
export interface BoosterConfig {
  type: BoosterType;
  name: string;
  slots: BoosterSlot[];
  wildcard?: {
    rareUpgrade?: number;  // Probability of rare upgrade
    foil?: number;         // Probability of foil
  };
}

/**
 * Pack EV breakdown by slot
 */
export interface PackEVBreakdown {
  totalEV: number;
  slotContributions: {
    rareMythicSlot: { ev: number; breakdown: Record<Rarity, number> };
    uncommonSlot: { ev: number; avgPrice: number };
    commonSlot: { ev: number; avgPrice: number };
    wildcard?: { ev: number; note: string };
  };
  foilAdjustment: number;
  confidence: number; // 0-1, based on data completeness
}

/**
 * Box EV breakdown with statistics
 */
export interface BoxEVBreakdown {
  totalEV: number;
  packEV: number;
  packCount: number;
  expectedMythics: number;
  expectedRares: number;
  expectedUncommons: number;
  topCards: TopValueCard[];
  variance: { min: number; median: number; max: number };
}

/**
 * Top value card information
 */
export interface TopValueCard {
  name: string;
  rarity: Rarity;
  price: number;
  foilPrice?: number;
  collectorNumber: string;
  contribution: number; // % of total EV
}

/**
 * Complete EV result for a sealed product
 */
export interface EVResult {
  productId: number;
  productName: string;
  sealedPrice: number;

  // EV Breakdown
  packEV: number;
  boxEV: number;
  evRatio: number;              // boxEV / sealedPrice
  evDifference: number;         // boxEV - sealedPrice

  // Confidence & Data Quality
  confidence: number;           // 0-1 (data completeness)
  dataSource: string;           // "Scryfall + Cardmarket"
  scryfallDataAge: number;      // Hours since last update
  cardmarketDataAge: number;    // Hours since last update

  // Set Information
  setCode: string;
  setName: string;
  expansionId: number;

  // Booster Configuration
  boosterType: BoosterType;
  boosterCount: number;

  // Rarity Breakdown
  breakdown: {
    mythicContribution: number;
    rareContribution: number;
    uncommonContribution: number;
    commonContribution: number;
    foilContribution: number;
  };

  // Top Cards
  topCards: TopValueCard[];

  // Statistical Info
  variance: {
    min: number;                // Worst-case box value
    median: number;             // Typical box value
    max: number;                // Best-case box value
  };
}

/**
 * Set-wide EV results
 */
export interface SetEVResults {
  setCode: string;
  setName: string;
  expansionId: number;

  products: EVResult[];

  // Set-wide statistics
  totalUniqueCards: number;
  priceableCards: number;
  totalSetValue: number;
  avgCardPrice: number;

  // Rarity stats
  mythics: { count: number; avgPrice: number; totalValue: number };
  rares: { count: number; avgPrice: number; totalValue: number };
  uncommons: { count: number; avgPrice: number; totalValue: number };
  commons: { count: number; avgPrice: number; totalValue: number };

  // Top cards
  topCards: TopValueCard[];
}

/**
 * Set statistics
 */
export interface SetStatistics {
  totalCards: number;
  priceableCards: number; // Cards with eur price >= threshold
  rarityBreakdown: Record<Rarity, number>;
  avgPriceByRarity: Record<Rarity, number>;
  totalValue: number; // Sum of all card prices
}

/**
 * EV display options
 */
export interface EVDisplayOptions {
  showTopCards: boolean;
  topCardLimit: number;
  showBreakdown: boolean;
  showVariance: boolean;
  showConfidence: boolean;
  currency: string;
}

/**
 * EV configuration
 */
export interface EVConfig {
  enabled: boolean;
  autoUpdate: boolean;
  updateFrequency: 'daily' | 'weekly' | 'manual';
  bulkCardThreshold: number;
  showVariance: boolean;
  confidenceThreshold: number;
}
