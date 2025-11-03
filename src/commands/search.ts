import { CardmarketAPI } from '../api/endpoints';
import { CardmarketClient } from '../api/client';
import { ShippingCalculator } from '../utils/shipping';
import { Formatter } from '../utils/formatter';
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
  private api: CardmarketAPI;
  private config: Config;

  constructor(config: Config) {
    this.config = config;

    const client = new CardmarketClient(
      config.credentials,
      config.cache.enabled,
      config.cache.ttl
    );

    this.api = new CardmarketAPI(client);
  }

  /**
   * Execute the search
   * @param searchTerm Card name to search for
   * @param options Search options
   */
  async execute(searchTerm: string, options: SearchOptions): Promise<void> {
    try {
      // Get configuration values with option overrides
      const maxResults = options.maxResults ?? this.config.preferences.maxResults;
      const useCache = !options.noCache;
      const currency = this.config.preferences.currency;
      const userCountry = this.config.preferences.country;

      // Search for products
      const products = await this.api.searchProducts(searchTerm, {
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
        const articlesResponse = await this.api.getArticles(product.idProduct, {
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
    } catch (error) {
      console.error(Formatter.formatError(error));
      process.exit(1);
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
