import { CardmarketClient } from './client';
import {
  ProductSearchResponse,
  Product,
  ArticleSearchResponse,
  CardCondition,
} from '../commands/types';

/**
 * High-level API methods for Cardmarket endpoints
 */
export class CardmarketAPI {
  private client: CardmarketClient;

  constructor(client: CardmarketClient) {
    this.client = client;
  }

  /**
   * Search for products by name
   * @param searchTerm Card name to search for
   * @param options Search options
   * @returns Array of matching products
   */
  async searchProducts(
    searchTerm: string,
    options: {
      exact?: boolean;
      idLanguage?: number;
      maxResults?: number;
      useCache?: boolean;
    } = {}
  ): Promise<Product[]> {
    const params: Record<string, string | number | boolean> = {
      search: searchTerm,
      idGame: 1, // Magic: The Gathering
    };

    if (options.exact !== undefined) {
      params.exact = options.exact;
    }

    if (options.idLanguage !== undefined) {
      params.idLanguage = options.idLanguage;
    }

    if (options.maxResults !== undefined) {
      params.maxResults = options.maxResults;
    }

    const useCache = options.useCache !== undefined ? options.useCache : true;

    const response = await this.client.get<ProductSearchResponse>(
      'products/find',
      params,
      useCache
    );

    // API returns either an array or a single object
    if (!response.product) {
      return [];
    }

    return Array.isArray(response.product) ? response.product : [response.product];
  }

  /**
   * Get detailed information about a product
   * @param idProduct Product ID
   * @param useCache Whether to use cache
   * @returns Product details
   */
  async getProduct(idProduct: number, useCache: boolean = true): Promise<Product> {
    const response = await this.client.get<{ product: Product }>(
      `products/${idProduct}`,
      undefined,
      useCache
    );

    return response.product;
  }

  /**
   * Get articles (seller offers) for a product
   * @param idProduct Product ID
   * @param options Filter options
   * @returns Array of articles
   */
  async getArticles(
    idProduct: number,
    options: {
      minCondition?: CardCondition;
      maxResults?: number;
      idLanguage?: number;
      isFoil?: boolean;
      isSigned?: boolean;
      isAltered?: boolean;
      minAvailable?: number;
      useCache?: boolean;
    } = {}
  ): Promise<ArticleSearchResponse> {
    const params: Record<string, string | number | boolean> = {};

    if (options.minCondition) {
      params.minCondition = options.minCondition;
    }

    if (options.maxResults !== undefined) {
      params.maxResults = options.maxResults;
    }

    if (options.idLanguage !== undefined) {
      params.idLanguage = options.idLanguage;
    }

    if (options.isFoil !== undefined) {
      params.isFoil = options.isFoil;
    }

    if (options.isSigned !== undefined) {
      params.isSigned = options.isSigned;
    }

    if (options.isAltered !== undefined) {
      params.isAltered = options.isAltered;
    }

    if (options.minAvailable !== undefined) {
      params.minAvailable = options.minAvailable;
    }

    const useCache = options.useCache !== undefined ? options.useCache : true;

    const response = await this.client.get<ArticleSearchResponse>(
      `products/${idProduct}/articles`,
      params,
      useCache
    );

    // Ensure article is always an array
    if (!response.article) {
      return { article: [] };
    }

    if (!Array.isArray(response.article)) {
      response.article = [response.article];
    }

    return response;
  }

  /**
   * Helper: Get language ID from language code
   * @param languageCode ISO language code (e.g., "EN", "DE")
   * @returns Language ID or undefined
   */
  static getLanguageId(languageCode: string): number | undefined {
    const languages: Record<string, number> = {
      'EN': 1,
      'FR': 2,
      'DE': 3,
      'ES': 4,
      'IT': 5,
      'S-CHI': 6,
      'JP': 8,
      'PT': 9,
      'RU': 10,
      'KO': 11,
      'T-CHI': 12,
      'CHI': 13,
    };

    return languages[languageCode.toUpperCase()];
  }

  /**
   * Helper: Convert condition code to minimum condition value
   * Card conditions from best to worst: MT, NM, EX, GD, LP, PL, PO
   * @param condition Condition code
   * @returns Numeric value for comparison
   */
  static conditionToValue(condition: CardCondition): number {
    const values: Record<CardCondition, number> = {
      'MT': 7,
      'NM': 6,
      'EX': 5,
      'GD': 4,
      'LP': 3,
      'PL': 2,
      'PO': 1,
    };

    return values[condition] || 0;
  }

  /**
   * Clear the API client cache
   */
  clearCache(): void {
    this.client.clearCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.client.getCacheStats();
  }
}
