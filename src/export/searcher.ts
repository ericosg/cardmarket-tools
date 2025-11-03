import { ExportDownloader } from './downloader';
import {
  ProductEntry,
  PriceGuideEntry,
  ExportSearchResult,
  ExportDataStatus,
} from './types';

/**
 * Export data searcher
 */
export class ExportSearcher {
  private products: ProductEntry[] = [];
  private priceGuide: Map<number, PriceGuideEntry> = new Map();
  private productsLoaded: boolean = false;
  private priceGuideLoaded: boolean = false;
  private productsDate?: Date;
  private priceGuideDate?: Date;

  /**
   * Load export data into memory
   */
  async load(): Promise<void> {
    // Download if needed (non-forced)
    await ExportDownloader.downloadAll(false);

    // Load products
    const productsData = ExportDownloader.loadProducts();
    if (productsData) {
      this.products = productsData.products;
      this.productsLoaded = true;
      this.productsDate = new Date(productsData.createdAt);
    }

    // Load price guide
    const priceGuideData = ExportDownloader.loadPriceGuide();
    if (priceGuideData) {
      // Convert array to Map for O(1) lookup
      for (const entry of priceGuideData.priceGuides) {
        this.priceGuide.set(entry.idProduct, entry);
      }
      this.priceGuideLoaded = true;
      this.priceGuideDate = new Date(priceGuideData.createdAt);
    }

    if (!this.productsLoaded || !this.priceGuideLoaded) {
      throw new Error('Failed to load export data. Try running: pnpm start update-data');
    }
  }

  /**
   * Search products by name
   * @param searchTerm Search term
   * @param options Search options
   * @returns Array of search results
   */
  search(
    searchTerm: string,
    options: {
      maxResults?: number;
      exact?: boolean;
    } = {}
  ): ExportSearchResult[] {
    if (!this.productsLoaded) {
      throw new Error('Export data not loaded. Call load() first.');
    }

    const term = searchTerm.toLowerCase().trim();
    const maxResults = options.maxResults || 20;
    const results: ExportSearchResult[] = [];

    for (const product of this.products) {
      const productName = product.name.toLowerCase();

      // Exact match
      if (options.exact && productName === term) {
        results.push({
          product,
          priceGuide: this.priceGuide.get(product.idProduct),
        });
        continue;
      }

      // Partial match
      if (!options.exact && productName.includes(term)) {
        results.push({
          product,
          priceGuide: this.priceGuide.get(product.idProduct),
        });
      }

      // Stop if we have enough results
      if (results.length >= maxResults) {
        break;
      }
    }

    return results;
  }

  /**
   * Get product by ID
   * @param idProduct Product ID
   * @returns Search result or null
   */
  getById(idProduct: number): ExportSearchResult | null {
    if (!this.productsLoaded) {
      throw new Error('Export data not loaded. Call load() first.');
    }

    const product = this.products.find((p) => p.idProduct === idProduct);
    if (!product) {
      return null;
    }

    return {
      product,
      priceGuide: this.priceGuide.get(idProduct),
    };
  }

  /**
   * Get data status
   * @returns Status information
   */
  getStatus(): ExportDataStatus {
    const productsAge = this.productsDate
      ? (Date.now() - this.productsDate.getTime()) / (1000 * 60 * 60)
      : undefined;

    const priceGuideAge = this.priceGuideDate
      ? (Date.now() - this.priceGuideDate.getTime()) / (1000 * 60 * 60)
      : undefined;

    const needsUpdate =
      (productsAge !== undefined && productsAge > 24) ||
      (priceGuideAge !== undefined && priceGuideAge > 24);

    return {
      productsLoaded: this.productsLoaded,
      priceGuideLoaded: this.priceGuideLoaded,
      productsDate: this.productsDate,
      priceGuideDate: this.priceGuideDate,
      productsAge,
      priceGuideAge,
      needsUpdate,
    };
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.productsLoaded && this.priceGuideLoaded;
  }

  /**
   * Get total number of products
   */
  getProductCount(): number {
    return this.products.length;
  }

  /**
   * Get total number of price guide entries
   */
  getPriceGuideCount(): number {
    return this.priceGuide.size;
  }
}
