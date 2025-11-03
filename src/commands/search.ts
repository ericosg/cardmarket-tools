import { CardmarketAPI } from '../api/endpoints';
import { CardmarketClient } from '../api/client';
import { ShippingCalculator } from '../utils/shipping';
import { Formatter } from '../utils/formatter';
import { ExportSearcher } from '../export/searcher';
import {
  Config,
  SearchOptions,
  SearchResult,
  EnrichedArticle,
  CardCondition,
  SortOption,
} from './types';

/**
 * Execute a search command
 */
export class SearchCommand {
  private api?: CardmarketAPI;
  private config: Config;
  private exportSearcher?: ExportSearcher;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Get or create API instance
   * Validates credentials when creating API client
   */
  private getAPI(): CardmarketAPI {
    if (this.api) {
      return this.api;
    }

    // Validate credentials are available
    if (!this.config.credentials) {
      throw new Error(
        'API credentials not found in config.json.\n' +
        'Live API mode requires Cardmarket API credentials.\n' +
        'Please add your credentials to config.json or use export mode (default).\n' +
        'Get API credentials at: https://www.cardmarket.com/en/Magic/Account/API'
      );
    }

    const client = new CardmarketClient(
      this.config.credentials,
      this.config.cache.enabled,
      this.config.cache.ttl
    );

    this.api = new CardmarketAPI(client);
    return this.api;
  }

  /**
   * Determine if we should use export data or API
   * @param options Search options
   * @returns true if should use export
   */
  private shouldUseExport(options: SearchOptions): boolean {
    // Export is disabled
    if (!this.config.export.enabled) {
      return false;
    }

    // User explicitly requested live API data
    if (options.live) {
      return false;
    }

    // Features that require API (seller-specific data)
    if (
      options.includeShipping ||
      options.condition ||
      options.signed ||
      options.altered ||
      options.filterCountry ||
      options.groupBySeller
    ) {
      return false;
    }

    // Use export for basic price lookups
    return true;
  }

  /**
   * Execute the search
   * @param searchTerm Card name to search for
   * @param options Search options
   */
  async execute(searchTerm: string, options: SearchOptions): Promise<void> {
    try {
      const useExport = this.shouldUseExport(options);

      if (useExport) {
        await this.executeExportSearch(searchTerm, options);
      } else {
        await this.executeAPISearch(searchTerm, options);
      }
    } catch (error) {
      console.error(Formatter.formatError(error));
      process.exit(1);
    }
  }

  /**
   * Execute search using export data
   * @param searchTerm Card name to search for
   * @param options Search options
   */
  private async executeExportSearch(
    searchTerm: string,
    options: SearchOptions
  ): Promise<void> {
    // Initialize export searcher if needed
    if (!this.exportSearcher) {
      this.exportSearcher = new ExportSearcher();
      await this.exportSearcher.load();
    }

    const maxResults = options.maxResults ?? this.config.preferences.maxResults;
    const currency = this.config.preferences.currency;

    // Perform search
    const results = this.exportSearcher.search(searchTerm, {
      maxResults,
      exact: false,
    });

    if (results.length === 0) {
      console.log(Formatter.formatWarning(`No products found for "${searchTerm}"`));
      return;
    }

    // Filter by price range if specified
    let filteredResults = results;
    if (options.minPrice !== undefined || options.maxPrice !== undefined) {
      filteredResults = results.filter((result) => {
        if (!result.priceGuide) return false;

        const price = result.priceGuide.trend;
        if (options.minPrice !== undefined && price < options.minPrice) {
          return false;
        }
        if (options.maxPrice !== undefined && price > options.maxPrice) {
          return false;
        }
        return true;
      });
    }

    // Determine sort method
    const sortBy = options.sort === 'price' ? 'trend' : (this.config.preferences.defaultSort || 'avg');

    // Sort results
    if (sortBy !== 'none') {
      filteredResults.sort((a, b) => {
        if (sortBy === 'name') {
          return a.product.name.localeCompare(b.product.name);
        }

        // Sort by price field (trend, low, or avg)
        const priceA = a.priceGuide?.[sortBy];
        const priceB = b.priceGuide?.[sortBy];

        // Handle null/undefined - put them at the end
        if (priceA == null && priceB == null) return 0;
        if (priceA == null) return 1;
        if (priceB == null) return -1;

        return priceA - priceB;
      });
    }

    // Limit results
    if (options.top !== undefined) {
      filteredResults = filteredResults.slice(0, options.top);
    }

    // Get data source info
    const status = this.exportSearcher.getStatus();
    const dataAge = status.priceGuideAge
      ? `${Math.floor(status.priceGuideAge)}h old`
      : 'unknown age';
    const dataSource = `Export data (updated ${status.priceGuideDate?.toISOString().split('T')[0]}, ${dataAge})`;

    // Show warning if data is old
    if (status.needsUpdate) {
      console.log(
        Formatter.formatWarning(
          'Export data is more than 24 hours old. Run "pnpm start update-data" to refresh.'
        )
      );
    }

    // Output results
    if (options.json) {
      console.log(Formatter.formatExportJSON(filteredResults));
    } else {
      console.log(
        Formatter.formatExportTable(filteredResults, {
          currency,
          dataSource,
        })
      );
    }
  }

  /**
   * Execute search using live API
   * @param searchTerm Card name to search for
   * @param options Search options
   */
  private async executeAPISearch(
    searchTerm: string,
    options: SearchOptions
  ): Promise<void> {
    // Get configuration values with option overrides
    const maxResults = options.maxResults ?? this.config.preferences.maxResults;
    const useCache = !options.noCache;
    const currency = this.config.preferences.currency;
    const userCountry = this.config.preferences.country;

    // Get API instance (will validate credentials)
    const api = this.getAPI();

    // Search for products
    const products = await api.searchProducts(searchTerm, {
      maxResults,
      useCache,
      idLanguage: options.language ? CardmarketAPI.getLanguageId(options.language) : undefined,
    });

    if (products.length === 0) {
      console.log(Formatter.formatWarning(`No products found for "${searchTerm}"`));
      return;
    }

    // Fetch articles for each product
    const results: SearchResult[] = [];

    for (const product of products) {
      const articlesResponse = await api.getArticles(product.idProduct, {
        maxResults: maxResults * 2, // Get more articles for better filtering
        minCondition: options.condition,
        isFoil: options.foil,
        isSigned: options.signed,
        isAltered: options.altered,
        idLanguage: options.language ? CardmarketAPI.getLanguageId(options.language) : undefined,
        useCache,
      });

      let articles = articlesResponse.article;

      // Filter by price range
      if (options.minPrice !== undefined) {
        articles = articles.filter((a) => a.price >= options.minPrice!);
      }

      if (options.maxPrice !== undefined) {
        articles = articles.filter((a) => a.price <= options.maxPrice!);
      }

      // Enrich with shipping information
      let enrichedArticles: EnrichedArticle[] = articles.map((a) => ({
        ...a,
        productName: product.name,
        expansionName: product.expansionName,
      }));

      if (options.includeShipping) {
        enrichedArticles = ShippingCalculator.enrichWithShipping(
          enrichedArticles,
          userCountry
        );

        // Filter by country if requested
        if (options.filterCountry) {
          enrichedArticles = ShippingCalculator.filterByShippingCountry(
            enrichedArticles,
            userCountry
          );
        }
      }

      // Sort articles
      enrichedArticles = this.sortArticles(enrichedArticles, options.sort, options.includeShipping);

      // Limit results
      if (options.top !== undefined) {
        enrichedArticles = enrichedArticles.slice(0, options.top);
      } else {
        enrichedArticles = enrichedArticles.slice(0, maxResults);
      }

      results.push({
        product,
        articles: enrichedArticles,
        bestOffer: enrichedArticles[0],
      });
    }

    // Output results
    if (options.json) {
      console.log(Formatter.formatJSON(results));
    } else if (options.groupBySeller && options.includeShipping) {
      // Group by seller view
      const allArticles = results.flatMap((r) => r.articles);
      const groups = ShippingCalculator.groupBySeller(allArticles);
      console.log(Formatter.formatGroupedBySeller(groups, currency));
    } else {
      // Standard table view
      console.log(
        Formatter.formatTable(results, {
          includeShipping: options.includeShipping,
          currency,
        })
      );
    }
  }

  /**
   * Sort articles by the specified criteria
   * @param articles Articles to sort
   * @param sortOption Sort criteria
   * @param includeShipping Whether shipping costs are included
   * @returns Sorted articles
   */
  private sortArticles(
    articles: EnrichedArticle[],
    sortOption?: SortOption,
    includeShipping: boolean = false
  ): EnrichedArticle[] {
    const sorted = [...articles];

    switch (sortOption) {
      case 'price':
        if (includeShipping) {
          sorted.sort((a, b) => (a.totalCost ?? a.price) - (b.totalCost ?? b.price));
        } else {
          sorted.sort((a, b) => a.price - b.price);
        }
        break;

      case 'condition':
        sorted.sort((a, b) => {
          const aValue = CardmarketAPI.conditionToValue(a.condition);
          const bValue = CardmarketAPI.conditionToValue(b.condition);
          return bValue - aValue; // Best condition first
        });
        break;

      case 'seller-rating':
        sorted.sort((a, b) => b.seller.reputation - a.seller.reputation);
        break;

      default:
        // Default: sort by total cost if shipping included, otherwise by price
        if (includeShipping) {
          sorted.sort((a, b) => (a.totalCost ?? a.price) - (b.totalCost ?? b.price));
        } else {
          sorted.sort((a, b) => a.price - b.price);
        }
    }

    return sorted;
  }

  /**
   * Validate search options
   * @param options Search options
   * @throws Error if options are invalid
   */
  static validateOptions(options: SearchOptions): void {
    // Validate condition
    if (options.condition) {
      const validConditions: CardCondition[] = ['MT', 'NM', 'EX', 'GD', 'LP', 'PL', 'PO'];
      if (!validConditions.includes(options.condition)) {
        throw new Error(
          `Invalid condition: ${options.condition}. ` +
          `Valid values: ${validConditions.join(', ')}`
        );
      }
    }

    // Validate sort option
    if (options.sort) {
      const validSorts: SortOption[] = ['price', 'condition', 'seller-rating'];
      if (!validSorts.includes(options.sort)) {
        throw new Error(
          `Invalid sort option: ${options.sort}. ` +
          `Valid values: ${validSorts.join(', ')}`
        );
      }
    }

    // Validate price range
    if (options.minPrice !== undefined && options.minPrice < 0) {
      throw new Error('Minimum price cannot be negative');
    }

    if (options.maxPrice !== undefined && options.maxPrice < 0) {
      throw new Error('Maximum price cannot be negative');
    }

    if (
      options.minPrice !== undefined &&
      options.maxPrice !== undefined &&
      options.minPrice > options.maxPrice
    ) {
      throw new Error('Minimum price cannot be greater than maximum price');
    }

    // Validate top
    if (options.top !== undefined && options.top <= 0) {
      throw new Error('Top must be a positive number');
    }

    // Validate maxResults
    if (options.maxResults !== undefined && options.maxResults <= 0) {
      throw new Error('Max results must be a positive number');
    }
  }
}
