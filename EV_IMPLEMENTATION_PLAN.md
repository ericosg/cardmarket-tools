# Expected Value (EV) Implementation Plan

**Project:** Cardmarket CLI - EV Calculator Feature
**Created:** 2025-11-06
**Status:** Planning Complete - Ready for Implementation

---

## Executive Summary

This document outlines the implementation plan for adding Expected Value (EV) calculation capabilities to the Cardmarket CLI tool. The feature will cross-reference sealed product prices with singles prices to calculate the expected value of opening booster boxes, bundles, and other sealed products.

---

## Research Summary

### Industry EV Methodology

Expected Value (EV) represents the average value of cards you can expect to open from sealed products, calculated using:

```
EV = Σ (Card Price × Probability of Opening)
```

**Key Components:**
- **Rarity Distribution**: Cards appear at different frequencies based on rarity
- **Price Sources**: Market prices (trend/average preferred)
- **Bulk Threshold**: Cards <€1 typically ignored (bulk commons)
- **Variance Warning**: EV is statistical average - individual results vary significantly

**Standard Rarity Distribution (Modern Play Boosters):**
```typescript
{
  mythic: 1/8,      // ~1 mythic per 8 packs
  rare: 7/8,        // ~7 rares per 8 packs
  uncommon: 3,      // ~3 uncommons per pack
  common: 10        // ~10 commons per pack
}
```

### Available Data Sources

After extensive research, **Scryfall Bulk Data** was selected as the optimal source:

| Criteria | Scryfall | MTGJSON | EchoMTG | MTGStocks |
|----------|----------|---------|---------|-----------|
| **Cost** | Free | Free | Free tier | No API |
| **Rarity Data** | ✅ Yes | ✅ Yes | ❌ No | ❌ No API |
| **EUR Prices** | ✅ Yes | ✅ Yes | ❌ USD only | ❌ No API |
| **Auth Required** | ❌ No | ❌ No | ✅ Yes | ❌ Blocked |
| **Rate Limits** | 10/sec API, None for bulk | None | Yes | N/A |
| **Update Frequency** | Every 12h | Daily | Real-time | N/A |
| **Documentation** | Excellent | Good | Good | None |
| **File Size** | 158-493 MB | ~400 MB | N/A | N/A |

**Winner:** Scryfall Bulk Data
- Free forever, explicitly designed for community tools
- Complete rarity + EUR price data in one file
- No authentication needed
- No rate limits on bulk downloads
- Well documented with active community
- Matches Cardmarket region (EUR pricing)

---

## Architecture Overview

### Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     WEEKLY DATA UPDATE                          │
├─────────────────────────────────────────────────────────────────┤
│  1. Download Scryfall "Default Cards" bulk file (~493 MB)      │
│  2. Parse JSON and extract: {name, set, rarity, eur_price}     │
│  3. Store in ./data/scryfall_cards.json (~100 MB processed)    │
│  4. Build indices:                                              │
│     - setCode → [cards]                                         │
│     - expansionId → setCode (Cardmarket → Scryfall mapping)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    SEARCH TIME (Runtime)                        │
├─────────────────────────────────────────────────────────────────┤
│  User searches: "Bloomburrow Play Booster Box"                 │
│                                                                  │
│  1. Get sealed product from Cardmarket export                   │
│     → idExpansion: 574 (Bloomburrow)                           │
│     → price: €119.90                                            │
│     → boosterCount: 36                                          │
│                                                                  │
│  2. Map expansionId → Scryfall setCode                          │
│     → 574 → "BLB"                                              │
│                                                                  │
│  3. Get all singles from set "BLB" with price >€1               │
│     → Filter by rarity: {mythic, rare, uncommon, common}        │
│                                                                  │
│  4. Calculate EV using exact booster collation rules            │
│     → packEV = Σ(rarity_avg × rarity_weight)                   │
│     → boxEV = packEV × 36                                       │
│                                                                  │
│  5. Calculate value ratio                                       │
│     → evRatio = boxEV / boxPrice                                │
│     → indicator = evRatio >= 1.0 ? "✓" : "⚠"                  │
│                                                                  │
│  6. Display in table or detailed report                         │
└─────────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
cardmarket-tools/
├── data/
│   ├── products_singles.json         # Cardmarket singles (18 MB)
│   ├── products_nonsingles.json      # Cardmarket sealed (23 MB)
│   ├── price_guide.json              # Cardmarket prices (23 MB)
│   ├── scryfall_cards.json           # NEW: Scryfall card data (~100 MB)
│   ├── expansion_mapping.json        # NEW: Cardmarket ID → Scryfall code
│   └── booster_collation.json        # NEW: Exact pack configs per set
├── src/
│   ├── ev/                            # NEW: EV calculation system
│   │   ├── types.ts                   # EV-related TypeScript interfaces
│   │   ├── scryfall-downloader.ts     # Scryfall bulk data downloader
│   │   ├── scryfall-loader.ts         # Load and index Scryfall data
│   │   ├── expansion-mapper.ts        # Map Cardmarket ↔ Scryfall sets
│   │   ├── collation-engine.ts        # Booster pack composition rules
│   │   ├── ev-calculator.ts           # Core EV calculation logic
│   │   └── ev-formatter.ts            # EV output formatting
│   ├── commands/
│   │   ├── search.ts                  # MODIFY: Add EV to search results
│   │   └── ev-report.ts               # NEW: Detailed EV report command
│   └── index.ts                       # MODIFY: Add ev-report command
└── docs/
    └── EV_IMPLEMENTATION_PLAN.md      # This document
```

---

## Implementation Phases

### Phase 1: Data Infrastructure (Week 1)

**Goal:** Download, process, and index Scryfall data

#### 1.1 Scryfall Downloader (`src/ev/scryfall-downloader.ts`)

**Features:**
- Download Scryfall "Default Cards" bulk file from API
- Check file freshness (weekly updates)
- Streaming download for large files
- Automatic decompression (JSON.gz → JSON)
- Store raw data in `./data/scryfall_raw.json`
- Process and filter to relevant fields only

**Key Methods:**
```typescript
class ScryfallDownloader {
  // Download bulk data if needed (weekly check)
  static async downloadBulkData(force?: boolean): Promise<void>

  // Get bulk data file URL from Scryfall API
  static async getBulkDataUrl(): Promise<string>

  // Check if data needs update (>7 days old)
  static needsUpdate(): boolean

  // Get download status and file info
  static getDataStatus(): ScryfallDataStatus
}
```

**Data Processing:**
```typescript
// Extract only needed fields to reduce size
interface ProcessedCard {
  id: string;              // Scryfall UUID
  name: string;            // Card name
  set: string;             // Set code (e.g., "BLB")
  set_name: string;        // Full set name
  rarity: Rarity;          // "common" | "uncommon" | "rare" | "mythic"
  eur: number | null;      // EUR price (null if unavailable)
  eur_foil: number | null; // Foil EUR price
  collector_number: string; // Collector number
  released_at: string;     // Release date
}
```

#### 1.2 Expansion Mapper (`src/ev/expansion-mapper.ts`)

**Purpose:** Map Cardmarket expansion IDs to Scryfall set codes

**Approach:**
1. **Auto-matching (Primary):**
   - Compare set names using fuzzy matching
   - Match by release dates (±30 days)
   - Validate by checking if singles exist in both

2. **Manual Mapping (Fallback):**
   - Load `./data/expansion_mapping.json` for overrides
   - Handle edge cases (different names, promo sets)
   - User can add custom mappings

**Mapping File Structure:**
```json
{
  "version": 1,
  "lastUpdated": "2025-11-06",
  "autoGenerated": {
    "45": { "code": "MRD", "name": "Mirrodin", "confidence": 1.0 },
    "574": { "code": "BLB", "name": "Bloomburrow", "confidence": 1.0 }
  },
  "manualOverrides": {
    "999": { "code": "SLD", "name": "Secret Lair Drop", "reason": "Name mismatch" }
  },
  "unmapped": [
    { "id": 123, "name": "Unknown Promo Set", "reason": "Not in Scryfall" }
  ]
}
```

**Key Methods:**
```typescript
class ExpansionMapper {
  // Initialize mapper with auto-matching
  async initialize(): Promise<void>

  // Map Cardmarket expansionId to Scryfall set code
  getSetCode(expansionId: number): string | null

  // Reverse: Scryfall code to Cardmarket ID
  getExpansionId(setCode: string): number | null

  // Get mapping confidence (for diagnostics)
  getMappingConfidence(expansionId: number): number

  // Add manual override
  addManualMapping(expansionId: number, setCode: string): void

  // Generate auto-mappings using fuzzy matching
  private generateAutoMappings(): void

  // Save mappings to file
  saveMapping(): void
}
```

#### 1.3 Scryfall Loader (`src/ev/scryfall-loader.ts`)

**Purpose:** Load and index Scryfall data for fast lookups

**Indices Created:**
```typescript
class ScryfallLoader {
  private cards: Map<string, ProcessedCard>;           // id → card
  private cardsBySet: Map<string, ProcessedCard[]>;    // setCode → [cards]
  private cardsByRarity: Map<string, Map<Rarity, ProcessedCard[]>>; // setCode → rarity → [cards]

  async load(): Promise<void>

  // Get all cards from a set
  getSetCards(setCode: string): ProcessedCard[]

  // Get cards by set and rarity
  getCardsByRarity(setCode: string, rarity: Rarity): ProcessedCard[]

  // Get single card by name and set
  getCard(name: string, setCode: string): ProcessedCard | null

  // Get set statistics
  getSetStats(setCode: string): SetStatistics
}

interface SetStatistics {
  totalCards: number;
  priceableCards: number; // Cards with eur price
  rarityBreakdown: Record<Rarity, number>;
  avgPriceByRarity: Record<Rarity, number>;
  totalValue: number; // Sum of all card prices
}
```

---

### Phase 2: Booster Collation Engine (Week 1-2)

**Goal:** Implement exact booster pack composition rules per set

#### 2.1 Booster Collation Rules (`data/booster_collation.json`)

**Structure:**
```json
{
  "version": 1,
  "lastUpdated": "2025-11-06",
  "sources": [
    "https://mtg.fandom.com/wiki/Booster_pack",
    "Official WotC announcements"
  ],
  "defaultRules": {
    "playBooster": {
      "name": "Play Booster (2024+)",
      "slots": [
        { "type": "rare_mythic", "count": 1, "distribution": { "rare": 7, "mythic": 1 } },
        { "type": "uncommon", "count": 3 },
        { "type": "common", "count": 10 },
        { "type": "land", "count": 1, "special": "basic or special" }
      ],
      "wildcard": { "rareUpgrade": 0.07, "foil": 0.33 }
    },
    "draftBooster": {
      "name": "Draft Booster (Pre-2024)",
      "slots": [
        { "type": "rare_mythic", "count": 1, "distribution": { "rare": 7, "mythic": 1 } },
        { "type": "uncommon", "count": 3 },
        { "type": "common", "count": 10 },
        { "type": "land", "count": 1 }
      ]
    },
    "setBooster": {
      "name": "Set Booster",
      "slots": [
        { "type": "rare_mythic", "count": 1, "distribution": { "rare": 15, "mythic": 1 } },
        { "type": "wildcard", "count": 1, "options": ["rare", "uncommon", "common"] },
        { "type": "uncommon", "count": 3 },
        { "type": "common", "count": 6 },
        { "type": "land", "count": 1, "special": "foil possible" },
        { "type": "thelist", "count": 1, "probability": 0.25 }
      ]
    },
    "collectorBooster": {
      "name": "Collector Booster",
      "slots": [
        { "type": "rare_mythic", "count": 4, "special": "extended art, foil possible" },
        { "type": "uncommon", "count": 3, "special": "foil possible" },
        { "type": "common", "count": 5, "special": "foil possible" },
        { "type": "foil", "count": 2, "any_rarity": true }
      ],
      "note": "Highly variable by set"
    }
  },
  "setSpecificRules": {
    "BLB": {
      "setCode": "BLB",
      "setName": "Bloomburrow",
      "boosterType": "playBooster",
      "customSlots": null,
      "notes": "Standard Play Booster configuration"
    },
    "MH3": {
      "setCode": "MH3",
      "setName": "Modern Horizons 3",
      "boosterType": "draftBooster",
      "customSlots": [
        { "type": "rare_mythic", "count": 2, "distribution": { "rare": 7, "mythic": 1 } }
      ],
      "notes": "Double rare per pack"
    },
    "2X2": {
      "setCode": "2X2",
      "setName": "Double Masters 2022",
      "boosterType": "draftBooster",
      "customSlots": [
        { "type": "rare_mythic", "count": 2, "distribution": { "rare": 7, "mythic": 1 } },
        { "type": "foil", "count": 2 }
      ],
      "notes": "2 rares + 2 foils guaranteed"
    }
  }
}
```

#### 2.2 Collation Engine (`src/ev/collation-engine.ts`)

**Purpose:** Calculate exact EV based on booster composition rules

**Key Methods:**
```typescript
class CollationEngine {
  // Load booster collation rules
  async load(): Promise<void>

  // Get booster configuration for a set
  getBoosterConfig(setCode: string, boosterType: string): BoosterConfig

  // Calculate expected value per pack
  calculatePackEV(
    setCode: string,
    boosterType: string,
    cards: ProcessedCard[]
  ): PackEVBreakdown

  // Calculate expected value per box
  calculateBoxEV(
    setCode: string,
    boosterType: string,
    packCount: number,
    cards: ProcessedCard[]
  ): BoxEVBreakdown

  // Simulate opening N packs (for variance analysis)
  simulateOpening(
    setCode: string,
    boosterType: string,
    packCount: number
  ): SimulationResult
}

interface PackEVBreakdown {
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

interface BoxEVBreakdown {
  totalEV: number;
  packEV: number;
  packCount: number;
  expectedMythics: number;
  expectedRares: number;
  expectedUncommons: number;
  topCards: Array<{ name: string; price: number; rarity: Rarity }>;
  variance: { min: number; median: number; max: number };
}
```

**Calculation Algorithm:**
```typescript
// Pseudocode for EV calculation
function calculatePackEV(setCode, boosterType, cards) {
  const config = getBoosterConfig(setCode, boosterType);
  let totalEV = 0;

  // For each slot in the pack
  for (const slot of config.slots) {
    if (slot.type === 'rare_mythic') {
      // Calculate weighted average
      const mythics = cards.filter(c => c.rarity === 'mythic' && c.eur >= 1);
      const rares = cards.filter(c => c.rarity === 'rare' && c.eur >= 1);

      const mythicAvg = average(mythics.map(c => c.eur));
      const rareAvg = average(rares.map(c => c.eur));

      const mythicWeight = slot.distribution.mythic / (slot.distribution.mythic + slot.distribution.rare);
      const rareWeight = slot.distribution.rare / (slot.distribution.mythic + slot.distribution.rare);

      totalEV += (mythicAvg * mythicWeight) + (rareAvg * rareWeight);

    } else if (slot.type === 'uncommon') {
      const uncommons = cards.filter(c => c.rarity === 'uncommon' && c.eur >= 1);
      totalEV += average(uncommons.map(c => c.eur)) * slot.count;

    } else if (slot.type === 'common') {
      const commons = cards.filter(c => c.rarity === 'common' && c.eur >= 1);
      totalEV += average(commons.map(c => c.eur)) * slot.count;
    }
  }

  // Apply special adjustments (foils, wildcards, etc.)
  if (config.wildcard?.foil) {
    totalEV += calculateFoilAdjustment(cards, config.wildcard.foil);
  }

  return totalEV;
}
```

---

### Phase 3: EV Calculator Core (Week 2)

**Goal:** Implement main EV calculation logic

#### 3.1 EV Calculator (`src/ev/ev-calculator.ts`)

**Main Class:**
```typescript
export class EVCalculator {
  private scryfallLoader: ScryfallLoader;
  private expansionMapper: ExpansionMapper;
  private collationEngine: CollationEngine;
  private boosterCountLookup: BoosterCountLookup;

  async initialize(): Promise<void>

  // Calculate EV for a sealed product
  async calculateEV(
    productId: number,
    productName: string,
    categoryName: string,
    expansionId: number,
    sealedPrice: number
  ): Promise<EVResult | null>

  // Calculate EV for all products in a set
  async calculateSetEVs(expansionId: number): Promise<SetEVResults>

  // Get top value cards from a set
  getTopValueCards(
    expansionId: number,
    limit: number = 20,
    minPrice: number = 1.0
  ): TopValueCard[]
}

interface EVResult {
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
  boosterType: string;          // "playBooster", "draftBooster", etc.
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

interface TopValueCard {
  name: string;
  rarity: Rarity;
  price: number;
  foilPrice?: number;
  collectorNumber: string;
  contribution: number;         // % of total EV
}

interface SetEVResults {
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
```

#### 3.2 EV Types (`src/ev/types.ts`)

**Core Types:**
```typescript
export type Rarity = 'common' | 'uncommon' | 'rare' | 'mythic' | 'special' | 'bonus';

export interface ScryfallDataStatus {
  downloaded: boolean;
  fileSize: number;
  lastUpdated?: Date;
  age?: number; // hours
  needsUpdate: boolean;
  cardCount: number;
}

export interface BoosterConfig {
  type: string;
  name: string;
  slots: BoosterSlot[];
  wildcard?: {
    rareUpgrade?: number;
    foil?: number;
  };
}

export interface BoosterSlot {
  type: 'rare_mythic' | 'uncommon' | 'common' | 'wildcard' | 'foil' | 'land';
  count: number;
  distribution?: Record<Rarity, number>;
  special?: string;
}

export interface ExpansionMapping {
  expansionId: number;
  setCode: string;
  setName: string;
  confidence: number;
  source: 'auto' | 'manual';
}

export interface EVDisplayOptions {
  showTopCards: boolean;
  topCardLimit: number;
  showBreakdown: boolean;
  showVariance: boolean;
  showConfidence: boolean;
  currency: string;
}
```

---

### Phase 4: Integration with Search (Week 2-3)

**Goal:** Add EV data to existing search functionality

#### 4.1 Modify Search Command (`src/commands/search.ts`)

**Changes:**
```typescript
class SearchCommand {
  private evCalculator?: EVCalculator;

  // Initialize EV calculator if needed
  private async getEVCalculator(): Promise<EVCalculator | null> {
    if (!this.config.ev?.enabled) return null;

    if (!this.evCalculator) {
      this.evCalculator = new EVCalculator();
      await this.evCalculator.initialize();
    }

    return this.evCalculator;
  }

  // Modify executeExportSearch to include EV
  private async executeExportSearch(
    searchTerm: string,
    options: SearchOptions
  ): Promise<void> {
    // ... existing search logic ...

    // Add EV calculation for sealed products (if --show-ev flag)
    if (options.showEV) {
      const evCalc = await this.getEVCalculator();

      if (evCalc) {
        for (const result of filteredResults) {
          // Only calculate EV for sealed products
          if (result.product.categoryName !== 'Magic Single') {
            const ev = await evCalc.calculateEV(
              result.product.idProduct,
              result.product.name,
              result.product.categoryName,
              result.product.idExpansion,
              result.priceGuide?.avg || 0
            );

            // Attach EV to result
            (result as any).ev = ev;
          }
        }
      }
    }

    // Output with EV if available
    if (options.json) {
      console.log(Formatter.formatExportJSON(filteredResults));
    } else {
      console.log(
        Formatter.formatExportTable(filteredResults, {
          currency,
          dataSource,
          hideFoil,
          showPerBooster,
          showEV: options.showEV, // NEW
        })
      );
    }
  }
}
```

#### 4.2 Update Formatter (`src/utils/formatter.ts`)

**Add EV Columns:**
```typescript
class Formatter {
  static formatExportTable(
    results: ExportSearchResult[],
    options: {
      currency: string;
      dataSource: string;
      hideFoil?: boolean;
      showPerBooster?: boolean;
      showEV?: boolean; // NEW
    }
  ): string {
    // ... existing code ...

    // Add EV columns if enabled
    if (options.showEV) {
      headers.push('Box EV', 'EV Ratio', 'Status');

      // For each result, format EV data
      for (const result of results) {
        const ev = (result as any).ev as EVResult | undefined;

        if (ev) {
          row.push(
            chalk.cyan(`${ev.boxEV.toFixed(2)} ${options.currency}`),
            this.formatEVRatio(ev.evRatio),
            this.formatEVStatus(ev.evRatio)
          );
        } else {
          row.push('N/A', 'N/A', '-');
        }
      }
    }

    return table.toString();
  }

  private static formatEVRatio(ratio: number): string {
    const formatted = ratio.toFixed(2) + 'x';
    if (ratio >= 1.2) return chalk.green(formatted);
    if (ratio >= 1.0) return chalk.yellow(formatted);
    return chalk.red(formatted);
  }

  private static formatEVStatus(ratio: number): string {
    if (ratio >= 1.0) return chalk.green('✓ Positive');
    return chalk.yellow('⚠ Negative');
  }
}
```

**Table Output Example:**
```
┌─────────────────────────────────┬───────┬──────────┬─────────┬──────────┬────────┐
│ Card Name                       │ Avg   │ Per Pack │ Box EV  │ EV Ratio │ Status │
├─────────────────────────────────┼───────┼──────────┼─────────┼──────────┼────────┤
│ Bloomburrow Play Booster Box    │119.90€│ 3.33€    │ 145.50€ │ 1.21x    │ ✓ Pos  │
│ Duskmourn Collector Booster Box │316.47€│ 26.37€   │ 285.30€ │ 0.90x    │ ⚠ Neg  │
│ Foundations Bundle              │ 45.07€│ 5.01€    │ 52.20€  │ 1.16x    │ ✓ Pos  │
└─────────────────────────────────┴───────┴──────────┴─────────┴──────────┴────────┘

Note: EV calculations use Scryfall data (updated 2025-11-05, 18h old).
      Cards <€1 are excluded (industry standard).
      Individual results will vary significantly from expected value.
```

---

### Phase 5: EV Report Command (Week 3)

**Goal:** Create detailed EV analysis report command

#### 5.1 EV Report Command (`src/commands/ev-report.ts`)

**New Command:**
```typescript
export class EVReportCommand {
  private evCalculator: EVCalculator;
  private config: Config;

  constructor(config: Config) {
    this.config = config;
    this.evCalculator = new EVCalculator();
  }

  async execute(setNameOrCode: string): Promise<void> {
    await this.evCalculator.initialize();

    // Find set by name or code
    const setResults = await this.findSet(setNameOrCode);

    if (setResults.length === 0) {
      console.log(Formatter.formatError(`Set not found: ${setNameOrCode}`));
      return;
    }

    if (setResults.length > 1) {
      console.log(Formatter.formatWarning('Multiple sets found:'));
      setResults.forEach(s => console.log(`  - ${s.setName} (${s.setCode})`));
      return;
    }

    const set = setResults[0];

    // Calculate EV for all products in set
    const evResults = await this.evCalculator.calculateSetEVs(set.expansionId);

    // Format and display report
    console.log(EVFormatter.formatDetailedReport(evResults, this.config.preferences.currency));
  }

  private async findSet(searchTerm: string): Promise<SetInfo[]> {
    // Search in Scryfall data and Cardmarket data
    // Return matching sets
  }
}
```

#### 5.2 EV Formatter (`src/ev/ev-formatter.ts`)

**Detailed Report Format:**
```typescript
export class EVFormatter {
  static formatDetailedReport(results: SetEVResults, currency: string): string {
    const output: string[] = [];

    // Header
    output.push('═'.repeat(80));
    output.push(chalk.bold.cyan(`  EXPECTED VALUE REPORT: ${results.setName}`));
    output.push('═'.repeat(80));
    output.push('');

    // Set Statistics
    output.push(chalk.bold('SET STATISTICS'));
    output.push('─'.repeat(80));
    output.push(`  Total Unique Cards:     ${results.totalUniqueCards}`);
    output.push(`  Priceable Cards (≥€1):  ${results.priceableCards}`);
    output.push(`  Total Set Value:        ${results.totalSetValue.toFixed(2)} ${currency}`);
    output.push(`  Average Card Price:     ${results.avgCardPrice.toFixed(2)} ${currency}`);
    output.push('');

    // Rarity Breakdown
    output.push(chalk.bold('RARITY BREAKDOWN'));
    output.push('─'.repeat(80));
    output.push(`  Mythics:    ${results.mythics.count} cards  │  Avg: ${results.mythics.avgPrice.toFixed(2)} ${currency}  │  Total: ${results.mythics.totalValue.toFixed(2)} ${currency}`);
    output.push(`  Rares:      ${results.rares.count} cards  │  Avg: ${results.rares.avgPrice.toFixed(2)} ${currency}  │  Total: ${results.rares.totalValue.toFixed(2)} ${currency}`);
    output.push(`  Uncommons:  ${results.uncommons.count} cards  │  Avg: ${results.uncommons.avgPrice.toFixed(2)} ${currency}  │  Total: ${results.uncommons.totalValue.toFixed(2)} ${currency}`);
    output.push(`  Commons:    ${results.commons.count} cards  │  Avg: ${results.commons.avgPrice.toFixed(2)} ${currency}  │  Total: ${results.commons.totalValue.toFixed(2)} ${currency}`);
    output.push('');

    // Top 20 Value Cards
    output.push(chalk.bold(`TOP 20 VALUE CARDS (≥€1)`));
    output.push('─'.repeat(80));

    results.topCards.slice(0, 20).forEach((card, i) => {
      const rank = `${i + 1}.`.padEnd(4);
      const name = card.name.padEnd(40);
      const rarity = this.formatRarity(card.rarity).padEnd(10);
      const price = `${card.price.toFixed(2)} ${currency}`.padStart(12);
      const contrib = `(${card.contribution.toFixed(1)}%)`.padStart(8);

      output.push(`  ${rank}${name}${rarity}${price} ${chalk.dim(contrib)}`);
    });
    output.push('');

    // Sealed Products EV
    output.push(chalk.bold('SEALED PRODUCTS EXPECTED VALUE'));
    output.push('─'.repeat(80));

    const table = new Table({
      head: ['Product', 'Price', 'Box EV', 'Pack EV', 'Ratio', 'Status'],
      style: { head: ['cyan'] }
    });

    results.products.forEach(product => {
      table.push([
        product.productName,
        `${product.sealedPrice.toFixed(2)} ${currency}`,
        `${product.boxEV.toFixed(2)} ${currency}`,
        `${product.packEV.toFixed(2)} ${currency}`,
        this.formatEVRatio(product.evRatio),
        this.formatEVStatus(product.evRatio)
      ]);
    });

    output.push(table.toString());
    output.push('');

    // EV Analysis
    output.push(chalk.bold('EV ANALYSIS'));
    output.push('─'.repeat(80));

    const bestProduct = results.products.reduce((best, curr) =>
      curr.evRatio > best.evRatio ? curr : best
    );

    output.push(`  Best Value:  ${chalk.green(bestProduct.productName)}`);
    output.push(`               ${chalk.green(`${bestProduct.evRatio.toFixed(2)}x`)} (€${bestProduct.evDifference.toFixed(2)} expected profit per box)`);
    output.push('');

    // Recommendations
    output.push(chalk.bold('RECOMMENDATIONS'));
    output.push('─'.repeat(80));

    const positiveEV = results.products.filter(p => p.evRatio >= 1.0);

    if (positiveEV.length > 0) {
      output.push(chalk.green(`  ✓ ${positiveEV.length} product(s) with positive EV`));
      output.push(`    Consider these for opening or bulk purchasing.`);
    } else {
      output.push(chalk.red(`  ⚠ All products have negative EV`));
      output.push(`    Better to buy singles directly than crack packs.`);
    }
    output.push('');

    // Variance Warning
    output.push(chalk.bold.yellow('⚠ IMPORTANT DISCLAIMER'));
    output.push('─'.repeat(80));
    output.push(chalk.dim('  Expected Value (EV) is a statistical average over many openings.'));
    output.push(chalk.dim('  Individual boxes will vary significantly from the calculated EV.'));
    output.push(chalk.dim('  Use EV for comparison purposes only, not as a guarantee of value.'));
    output.push(chalk.dim('  Cards <€1 are excluded from calculations (industry standard).'));
    output.push('');

    // Data Sources
    output.push(chalk.dim(`Data Sources: Scryfall (${results.products[0]?.scryfallDataAge}h old) + Cardmarket (${results.products[0]?.cardmarketDataAge}h old)`));
    output.push(chalk.dim(`Generated: ${new Date().toISOString()}`));
    output.push('═'.repeat(80));

    return output.join('\n');
  }

  private static formatRarity(rarity: Rarity): string {
    const colors: Record<Rarity, any> = {
      mythic: chalk.red,
      rare: chalk.yellow,
      uncommon: chalk.cyan,
      common: chalk.white,
      special: chalk.magenta,
      bonus: chalk.gray
    };

    return colors[rarity]?.(rarity.toUpperCase()) || rarity;
  }

  private static formatEVRatio(ratio: number): string {
    const formatted = `${ratio.toFixed(2)}x`;
    if (ratio >= 1.2) return chalk.green(formatted);
    if (ratio >= 1.0) return chalk.yellow(formatted);
    return chalk.red(formatted);
  }

  private static formatEVStatus(ratio: number): string {
    if (ratio >= 1.0) return chalk.green('✓ Positive');
    return chalk.red('⚠ Negative');
  }
}
```

**Example Report Output:**
```
════════════════════════════════════════════════════════════════════════════════
  EXPECTED VALUE REPORT: Bloomburrow
════════════════════════════════════════════════════════════════════════════════

SET STATISTICS
────────────────────────────────────────────────────────────────────────────────
  Total Unique Cards:     281
  Priceable Cards (≥€1):  87
  Total Set Value:        €1,247.50
  Average Card Price:     €4.44

RARITY BREAKDOWN
────────────────────────────────────────────────────────────────────────────────
  Mythics:    20 cards  │  Avg: €8.50 €  │  Total: €170.00 €
  Rares:      60 cards  │  Avg: €3.75 €  │  Total: €225.00 €
  Uncommons:  80 cards  │  Avg: €0.45 €  │  Total: €36.00 €
  Commons:    121 cards  │  Avg: €0.05 €  │  Total: €6.05 €

TOP 20 VALUE CARDS (≥€1)
────────────────────────────────────────────────────────────────────────────────
  1.  Leyline of Resonance                  MYTHIC       €45.00  (15.2%)
  2.  Three Tree Mascot                     MYTHIC       €12.50  (4.2%)
  3.  Valley Floodcaller                    RARE         €8.25   (2.8%)
  4.  Enduring Curiosity                    MYTHIC       €7.80   (2.6%)
  5.  Lumra, Bellow of the Woods            MYTHIC       €6.50   (2.2%)
  ...
  20. Thornwood Falls                       COMMON       €1.10   (0.4%)

SEALED PRODUCTS EXPECTED VALUE
────────────────────────────────────────────────────────────────────────────────
┌──────────────────────────────────┬─────────┬─────────┬──────────┬────────┬────────────┐
│ Product                          │ Price   │ Box EV  │ Pack EV  │ Ratio  │ Status     │
├──────────────────────────────────┼─────────┼─────────┼──────────┼────────┼────────────┤
│ Play Booster Box (36 packs)     │ 119.90€ │ 145.50€ │ 4.04€    │ 1.21x  │ ✓ Positive │
│ Collector Booster Box (12 packs)│ 316.47€ │ 285.30€ │ 23.78€   │ 0.90x  │ ⚠ Negative │
│ Bundle (9 packs)                 │ 45.07€  │ 52.20€  │ 5.80€    │ 1.16x  │ ✓ Positive │
└──────────────────────────────────┴─────────┴─────────┴──────────┴────────┴────────────┘

EV ANALYSIS
────────────────────────────────────────────────────────────────────────────────
  Best Value:  Play Booster Box (36 packs)
               1.21x (€25.60 expected profit per box)

RECOMMENDATIONS
────────────────────────────────────────────────────────────────────────────────
  ✓ 2 product(s) with positive EV
    Consider these for opening or bulk purchasing.

⚠ IMPORTANT DISCLAIMER
────────────────────────────────────────────────────────────────────────────────
  Expected Value (EV) is a statistical average over many openings.
  Individual boxes will vary significantly from the calculated EV.
  Use EV for comparison purposes only, not as a guarantee of value.
  Cards <€1 are excluded from calculations (industry standard).

Data Sources: Scryfall (18h old) + Cardmarket (12h old)
Generated: 2025-11-06T14:32:15.000Z
════════════════════════════════════════════════════════════════════════════════
```

---

### Phase 6: Configuration & CLI (Week 3)

#### 6.1 Update Config Schema (`src/config.ts`)

**Add EV Configuration:**
```typescript
interface Config {
  // ... existing fields ...

  ev: {
    enabled: boolean;              // Enable EV calculations (default: true)
    autoUpdate: boolean;           // Auto-download Scryfall data (default: true)
    updateFrequency: 'daily' | 'weekly' | 'manual'; // Update frequency (default: 'weekly')
    bulkCardThreshold: number;     // Min price for EV calc (default: 1.0)
    showVariance: boolean;         // Show variance in reports (default: false)
    confidenceThreshold: number;   // Min confidence to show EV (default: 0.7)
  };
}
```

**Example `config.json`:**
```json
{
  "credentials": { ... },
  "preferences": { ... },
  "cache": { ... },
  "export": { ... },
  "ev": {
    "enabled": true,
    "autoUpdate": true,
    "updateFrequency": "weekly",
    "bulkCardThreshold": 1.0,
    "showVariance": false,
    "confidenceThreshold": 0.7
  }
}
```

#### 6.2 Update CLI (`src/index.ts`)

**Add EV Commands:**
```typescript
// Update existing search command
program
  .command('search')
  .argument('<card-name>', 'Card or product name to search for')
  // ... existing options ...
  .option('--show-ev', 'Show expected value for sealed products')
  .action(async (cardName, options) => {
    // ... existing logic ...
  });

// New EV report command
program
  .command('ev-report')
  .alias('ev')
  .argument('<set-name>', 'Set name or code to analyze')
  .description('Generate detailed expected value report for a set')
  .option('--top <number>', 'Show top N value cards', '20')
  .option('--show-variance', 'Show variance analysis')
  .option('--json', 'Output in JSON format')
  .action(async (setName, options) => {
    const config = loadConfig();
    const command = new EVReportCommand(config);
    await command.execute(setName);
  });

// Update data command to include Scryfall
program
  .command('update-data')
  .description('Download and update export data files (Cardmarket + Scryfall)')
  .option('--force', 'Force download even if data is recent')
  .option('--scryfall-only', 'Only update Scryfall data')
  .option('--cardmarket-only', 'Only update Cardmarket data')
  .action(async (options) => {
    // ... existing Cardmarket download ...

    if (!options.cardmarketOnly) {
      console.log('Updating Scryfall data...');
      await ScryfallDownloader.downloadBulkData(options.force);
    }
  });
```

**New Commands:**
```bash
# Search with EV display
pnpm start search "Bloomburrow" --show-ev

# Detailed EV report
pnpm start ev-report "Bloomburrow"
pnpm start ev "BLB"  # Using alias

# Update data
pnpm start update-data              # Update both Cardmarket and Scryfall
pnpm start update-data --force      # Force update all
pnpm start update-data --scryfall-only  # Only Scryfall
```

---

### Phase 7: Testing & Validation (Week 4)

#### 7.1 Test Cases

**Data Download Tests:**
- [ ] Scryfall bulk data downloads successfully
- [ ] File decompression works
- [ ] Data parsing extracts correct fields
- [ ] Freshness checks work correctly

**Expansion Mapping Tests:**
- [ ] Auto-mapping matches major sets correctly
- [ ] Manual overrides work
- [ ] Unmapped sets are logged
- [ ] Mapping confidence scores are accurate

**EV Calculation Tests:**
- [ ] Pack EV calculation matches manual calculation
- [ ] Box EV = Pack EV × pack count
- [ ] Rarity weights are applied correctly
- [ ] Bulk threshold (€1) is respected
- [ ] Special booster types (Collector, etc.) handled

**Integration Tests:**
- [ ] Search with --show-ev displays EV columns
- [ ] ev-report command generates full report
- [ ] JSON output includes EV data
- [ ] Performance is acceptable (<2s for report)

**Edge Cases:**
- [ ] Sets with no Scryfall data (graceful failure)
- [ ] Products with no price data (show N/A)
- [ ] Very old sets (pre-2000)
- [ ] Special products (Commander decks, etc.)

#### 7.2 Validation Against Known Values

**Compare against industry sources:**
- MTGGoldfish historical EV articles
- Dawnglare set EV page
- TheExpectedValue.com calculators

**Example Validation:**
```typescript
// Test Case: Modern Horizons 3
// Known EV from MTGGoldfish (2024-06-15): $276 per box
// Expected: Our calculation should be within ±10%

const mh3Result = await evCalculator.calculateEV(...);
const expected = 276; // USD
const tolerance = 0.10; // 10%

assert(
  Math.abs(mh3Result.boxEV - expected) / expected <= tolerance,
  `MH3 box EV should be ~${expected} (got ${mh3Result.boxEV})`
);
```

#### 7.3 Performance Optimization

**Target Performance:**
- Scryfall data load: <5 seconds
- Single EV calculation: <100ms
- Full set report: <2 seconds
- Search with --show-ev: +500ms max overhead

**Optimization Strategies:**
- Cache parsed Scryfall data in memory
- Lazy-load EV calculator only when needed
- Use Map indices for O(1) lookups
- Pre-calculate rarity averages per set

---

## Configuration Details

### Config File Structure

**`config.json` with EV settings:**
```json
{
  "credentials": {
    "appToken": "optional",
    "appSecret": "optional",
    "accessToken": "optional",
    "accessTokenSecret": "optional"
  },
  "preferences": {
    "country": "DE",
    "currency": "EUR",
    "language": "en",
    "maxResults": 20,
    "defaultSort": "avg",
    "hideFoil": true,
    "showPerBooster": true,
    "productFilter": "both"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "export": {
    "enabled": true,
    "autoUpdate": true
  },
  "ev": {
    "enabled": true,
    "autoUpdate": true,
    "updateFrequency": "weekly",
    "bulkCardThreshold": 1.0,
    "showVariance": false,
    "confidenceThreshold": 0.7
  }
}
```

### CLI Command Reference

**New Commands:**
```bash
# Search with EV
pnpm start search "Bloomburrow" --show-ev
pnpm start search "Foundations" --show-ev --product-filter nonsingles

# EV Report
pnpm start ev-report "Bloomburrow"
pnpm start ev-report "BLB"
pnpm start ev "Modern Horizons 3"  # Using alias
pnpm start ev-report "Bloomburrow" --json
pnpm start ev-report "Bloomburrow" --top 50 --show-variance

# Data Updates
pnpm start update-data                    # Update all
pnpm start update-data --scryfall-only   # Scryfall only
pnpm start update-data --force           # Force update
```

**Modified Commands:**
```bash
# Search now supports --show-ev flag
pnpm start search "card name" [options] [--show-ev]
```

---

## Data Files Summary

### Existing Files (Current)
| File | Size | Update | Purpose |
|------|------|--------|---------|
| `products_singles.json` | 18 MB | Daily | Cardmarket singles catalog |
| `products_nonsingles.json` | 23 MB | Daily | Cardmarket sealed products |
| `price_guide.json` | 23 MB | Daily | Cardmarket price trends |
| `booster-counts.json` | <1 MB | Manual | Booster pack counts per product |

### New Files (EV Feature)
| File | Size | Update | Purpose |
|------|------|--------|---------|
| `scryfall_cards.json` | ~100 MB | Weekly | Processed Scryfall card data |
| `expansion_mapping.json` | <1 MB | Weekly | Cardmarket ↔ Scryfall set mapping |
| `booster_collation.json` | ~2 MB | Manual | Exact booster pack composition rules |

**Total Storage:**
- Current: ~64 MB
- With EV: ~167 MB
- Increase: +103 MB

---

## Success Criteria

### Feature Completeness
- [x] Research complete
- [ ] Scryfall downloader implemented
- [ ] Expansion mapper implemented with auto-matching
- [ ] Booster collation engine with exact rules
- [ ] EV calculator core logic
- [ ] Integration with search command
- [ ] EV report command
- [ ] All tests passing
- [ ] Documentation updated

### Quality Metrics
- **Accuracy:** EV calculations within ±10% of industry sources
- **Performance:** <2s for full set report, <500ms overhead for search
- **Coverage:** 90%+ of modern sets auto-mapped
- **Reliability:** Graceful handling of missing data
- **Usability:** Clear warnings about variance and limitations

### User Experience
- **Clarity:** EV data clearly displayed and explained
- **Warnings:** Prominent disclaimers about variance
- **Flexibility:** Both quick search integration and detailed reports
- **Configuration:** Easy to enable/disable feature
- **Documentation:** Clear examples and use cases

---

## Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: Data Infrastructure** | 3-4 days | Scryfall downloader, expansion mapper, loader |
| **Phase 2: Booster Collation** | 2-3 days | Collation rules, engine implementation |
| **Phase 3: EV Calculator** | 2-3 days | Core calculation logic, types |
| **Phase 4: Search Integration** | 2 days | Modify search command, update formatter |
| **Phase 5: EV Report Command** | 2-3 days | New command, detailed formatter |
| **Phase 6: Configuration & CLI** | 1 day | Config updates, CLI flags |
| **Phase 7: Testing & Validation** | 2-3 days | Test cases, validation, performance |

**Total Estimate:** 14-19 days (2.5-3.5 weeks)

---

## Risks & Mitigations

### Risk 1: Scryfall Data Structure Changes
**Impact:** High
**Probability:** Low
**Mitigation:**
- Use official Scryfall API documentation
- Implement data validation on download
- Add error handling for missing fields
- Monitor Scryfall changelog

### Risk 2: Expansion Mapping Failures
**Impact:** Medium
**Probability:** Medium
**Mitigation:**
- Fuzzy matching with confidence scores
- Manual override system
- Log unmapped sets for user review
- Provide mapping management commands

### Risk 3: Performance Issues with Large Files
**Impact:** Medium
**Probability:** Low
**Mitigation:**
- Stream processing for downloads
- Lazy loading of EV calculator
- In-memory caching with indices
- Optimize JSON parsing

### Risk 4: Booster Collation Complexity
**Impact:** Medium
**Probability:** Medium
**Mitigation:**
- Start with standard booster types
- Add special cases iteratively
- Document sources for rules
- Community feedback for corrections

### Risk 5: EV Accuracy Concerns
**Impact:** High (reputation)
**Probability:** Medium
**Mitigation:**
- Clear disclaimers about variance
- Validate against industry sources
- Document calculation methodology
- Show confidence scores

---

## Future Enhancements

### Post-Launch Features
1. **Historical EV Tracking**
   - Track EV over time using avg1/avg7/avg30 data
   - Show EV trends (rising/falling)
   - Optimal buying time suggestions

2. **Advanced Variance Analysis**
   - Monte Carlo simulations
   - Probability distributions
   - "X% chance to profit" metrics

3. **Multi-Set Comparison**
   - Compare EV across multiple sets
   - Find best value sets to buy
   - Historical EV rankings

4. **Foil EV Calculations**
   - Separate foil EV calculations
   - Collector booster analysis
   - Foil pull rates

5. **Custom Collation Rules**
   - User-defined booster configurations
   - Support for custom/specialty products
   - Regional booster variations

6. **API Endpoint**
   - Expose EV calculations as API
   - Allow external tools to use data
   - JSON/CSV export

7. **Alerts & Notifications**
   - Notify when set reaches positive EV
   - Price spike alerts for key cards
   - New set EV analysis on release

---

## References & Resources

### APIs & Data Sources
- **Scryfall API:** https://scryfall.com/docs/api
- **Scryfall Bulk Data:** https://scryfall.com/docs/api/bulk-data
- **MTGJSON:** https://mtgjson.com/
- **Cardmarket Export Data:** Existing integration

### EV Methodology Resources
- **MTGGoldfish EV Articles:** https://www.mtggoldfish.com/articles/search?tag=expected+value
- **MTG Dawnglare:** https://mtg.dawnglare.com/?p=sets
- **The Expected Value:** https://theexpectedvalue.com/
- **EchoEV:** https://www.echoev.app/magic-the-gathering/sets

### Booster Pack Information
- **MTG Wiki - Booster Pack:** https://mtg.fandom.com/wiki/Booster_pack
- **WotC Official Announcements:** Various articles on mothership
- **Set-specific release notes:** Per-set collation information

### Industry Standards
- **Bulk Card Threshold:** €1.00 (industry standard)
- **Rarity Distribution:** Based on WotC official ratios
- **Price Sources:** EUR prices from Scryfall (sourced from Cardmarket)

---

## Questions & Decisions Log

### Answered Decisions
1. **Expansion ID Mapping:** Auto-match with manual override fallback ✓
2. **Accuracy Approach:** Exact booster collation rules ✓
3. **Display Integration:** Both separate report + opt-in search flag ✓
4. **Update Strategy:** Weekly Scryfall downloads ✓
5. **Bulk Threshold:** Industry standard (€1.00) ✓

### Open Questions
- ❓ Should we implement foil EV separately or include in initial release?
- ❓ How to handle regional differences (EU vs US booster configs)?
- ❓ Should we cache EV calculations or recalculate on demand?
- ❓ What confidence threshold should trigger "low confidence" warnings?
- ❓ Should we show individual pack variance or just box-level?

---

## Contact & Contribution

**Primary Developer:** [Your Name]
**Project Repository:** [GitHub URL]
**Issue Tracker:** [GitHub Issues URL]

**Contributions Welcome:**
- Booster collation rules for new/old sets
- Expansion mapping corrections
- EV calculation validation
- Performance optimizations
- Documentation improvements

---

**Document Version:** 1.0
**Last Updated:** 2025-11-06
**Next Review:** After Phase 1 completion
