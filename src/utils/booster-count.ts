import fs from 'fs';
import path from 'path';

interface BoosterCountData {
  version: number;
  lastUpdated: string;
  defaultCounts: Record<string, number>;
  categoryMappings: Record<string, {
    patterns: Array<{ match: string; count: number | null }>;
  }>;
  setSpecificOverrides: Record<string, Record<string, number>>;
  notes: Record<string, string>;
}

/**
 * Utility for looking up booster counts for sealed products
 */
export class BoosterCountLookup {
  private static data: BoosterCountData | null = null;
  private static readonly DATA_FILE = path.join(process.cwd(), 'data', 'booster-counts.json');

  /**
   * Load booster count data from file
   */
  private static loadData(): BoosterCountData {
    if (this.data) {
      return this.data;
    }

    try {
      const fileData = fs.readFileSync(this.DATA_FILE, 'utf-8');
      this.data = JSON.parse(fileData) as BoosterCountData;
      return this.data;
    } catch (error) {
      console.warn('Warning: Could not load booster-counts.json. Per-booster pricing will show N/A.');
      // Return minimal data structure
      this.data = {
        version: 1,
        lastUpdated: '',
        defaultCounts: {},
        categoryMappings: {},
        setSpecificOverrides: {},
        notes: {},
      };
      return this.data;
    }
  }

  /**
   * Get booster count for a product
   * @param productName Product name
   * @param categoryName Category name (e.g., "Magic Display", "Magic Fatpack")
   * @returns Number of boosters, or null if not applicable
   */
  static getBoosterCount(productName: string, categoryName: string): number | null {
    const data = this.loadData();

    // Check if category supports booster counts
    const categoryMapping = data.categoryMappings[categoryName];
    if (!categoryMapping) {
      return null; // Category doesn't support per-booster pricing
    }

    // Extract set name from product name (usually the first part before the type)
    // Example: "Edge of Eternities Play Booster Box" -> "Edge of Eternities"
    const setName = this.extractSetName(productName);

    // Check set-specific overrides first
    if (setName && data.setSpecificOverrides[setName]) {
      const overrides = data.setSpecificOverrides[setName];

      // Try to match product type
      for (const [productType, count] of Object.entries(overrides)) {
        if (productName.includes(productType)) {
          return count;
        }
      }
    }

    // Check category patterns
    for (const pattern of categoryMapping.patterns) {
      if (productName.includes(pattern.match)) {
        return pattern.count;
      }
    }

    // Return null if no match found
    return null;
  }

  /**
   * Extract set name from product name
   * @param productName Full product name
   * @returns Set name or null
   */
  private static extractSetName(productName: string): string | null {
    // Common product type keywords that indicate where the set name ends
    const productTypes = [
      'Play Booster Box',
      'Draft Booster Box',
      'Set Booster Box',
      'Collector Booster Box',
      'Bundle',
      'Fat Pack',
      'Prerelease Pack',
      'Prerelease Promo',
      'Commander',
      'Theme Deck',
      'Intro Pack',
      'Tournament Pack',
    ];

    // Find the first product type keyword
    for (const productType of productTypes) {
      const index = productName.indexOf(productType);
      if (index !== -1) {
        // Extract everything before the product type
        return productName.substring(0, index).trim();
      }
    }

    // If no product type found, try to extract the first part before a colon
    const colonIndex = productName.indexOf(':');
    if (colonIndex !== -1) {
      return productName.substring(0, colonIndex).trim();
    }

    // Otherwise, return the whole name
    return productName.trim();
  }

  /**
   * Check if a category supports per-booster pricing
   * @param categoryName Category name
   * @returns true if category supports per-booster pricing
   */
  static supportsPerBoosterPricing(categoryName: string): boolean {
    const data = this.loadData();
    return categoryName in data.categoryMappings;
  }

  /**
   * Get all supported categories
   * @returns Array of category names that support per-booster pricing
   */
  static getSupportedCategories(): string[] {
    const data = this.loadData();
    return Object.keys(data.categoryMappings);
  }
}
