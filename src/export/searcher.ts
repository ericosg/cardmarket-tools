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
  private singlesProducts: ProductEntry[] = [];
  private nonsinglesProducts: ProductEntry[] = [];
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

    // Load singles
    const singlesData = ExportDownloader.loadProductsSingles();
    if (singlesData) {
      this.singlesProducts = singlesData.products;
      this.productsDate = new Date(singlesData.createdAt);
    }

    // Load non-singles
    const nonsinglesData = ExportDownloader.loadProductsNonsingles();
    if (nonsinglesData) {
      this.nonsinglesProducts = nonsinglesData.products;
      // Use the older date for safety
      const nonsinglesDate = new Date(nonsinglesData.createdAt);
      if (!this.productsDate || nonsinglesDate < this.productsDate) {
        this.productsDate = nonsinglesDate;
      }
    }

    // Merge all products for backward compatibility
    this.products = [...this.singlesProducts, ...this.nonsinglesProducts];

    // Mark as loaded if we have at least singles
    if (this.products.length > 0) {
      this.productsLoaded = true;
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
      productFilter?: 'singles' | 'nonsingles' | 'both';
    } = {}
  ): ExportSearchResult[] {
    if (!this.productsLoaded) {
      throw new Error('Export data not loaded. Call load() first.');
    }

    const term = searchTerm.toLowerCase().trim();
    const maxResults = options.maxResults || 20;
    const productFilter = options.productFilter || 'both';
    const results: ExportSearchResult[] = [];

    // Select the appropriate product array based on filter
    let productsToSearch: ProductEntry[];
    if (productFilter === 'singles') {
      productsToSearch = this.singlesProducts;
    } else if (productFilter === 'nonsingles') {
      productsToSearch = this.nonsinglesProducts;
    } else {
      productsToSearch = this.products; // 'both'
    }

    for (const product of productsToSearch) {
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
