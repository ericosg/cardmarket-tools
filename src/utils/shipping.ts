import { Article, EnrichedArticle } from '../commands/types';

/**
 * Estimated shipping costs by country
 * These are rough estimates as actual shipping varies by seller
 */
const SHIPPING_ESTIMATES: Record<string, Record<string, number>> = {
  // Domestic shipping
  'DE-DE': { standard: 1.0, tracked: 2.5 },
  'FR-FR': { standard: 1.0, tracked: 2.5 },
  'IT-IT': { standard: 1.0, tracked: 2.5 },
  'ES-ES': { standard: 1.0, tracked: 2.5 },
  'GB-GB': { standard: 1.0, tracked: 2.5 },
  'NL-NL': { standard: 1.0, tracked: 2.5 },
  'BE-BE': { standard: 1.0, tracked: 2.5 },

  // Within EU - Germany
  'DE-EU': { standard: 1.5, tracked: 4.0 },
  // Within EU - France
  'FR-EU': { standard: 1.5, tracked: 4.0 },
  // Within EU - Italy
  'IT-EU': { standard: 1.5, tracked: 4.0 },
  // Within EU - Spain
  'ES-EU': { standard: 1.5, tracked: 4.0 },
  // Within EU - Netherlands
  'NL-EU': { standard: 1.5, tracked: 4.0 },
  // Within EU - Belgium
  'BE-EU': { standard: 1.5, tracked: 4.0 },

  // UK to/from EU
  'GB-EU': { standard: 2.5, tracked: 6.0 },
  'EU-GB': { standard: 2.5, tracked: 6.0 },

  // International (non-EU)
  'EU-US': { standard: 3.0, tracked: 8.0 },
  'US-EU': { standard: 3.0, tracked: 8.0 },
  'EU-INTL': { standard: 3.5, tracked: 10.0 },
  'INTL-EU': { standard: 3.5, tracked: 10.0 },

  // Default fallback
  'DEFAULT': { standard: 2.0, tracked: 5.0 },
};

const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
];

/**
 * Shipping cost calculator
 */
export class ShippingCalculator {
  /**
   * Estimate shipping cost for an article to a destination country
   * @param article Article to calculate shipping for
   * @param destinationCountry Buyer's country code
   * @returns Estimated shipping cost
   */
  static estimateShipping(
    article: Article,
    destinationCountry: string
  ): number {
    const sellerCountry = article.seller.country;

    // Domestic shipping
    if (sellerCountry === destinationCountry) {
      const key = `${sellerCountry}-${sellerCountry}`;
      return SHIPPING_ESTIMATES[key]?.standard ?? SHIPPING_ESTIMATES['DEFAULT'].standard;
    }

    const isSellerEU = EU_COUNTRIES.includes(sellerCountry);
    const isBuyerEU = EU_COUNTRIES.includes(destinationCountry);

    // Within EU
    if (isSellerEU && isBuyerEU) {
      const key = `${sellerCountry}-EU`;
      return SHIPPING_ESTIMATES[key]?.standard ?? SHIPPING_ESTIMATES['DE-EU'].standard;
    }

    // UK to/from EU
    if (sellerCountry === 'GB' && isBuyerEU) {
      return SHIPPING_ESTIMATES['GB-EU'].standard;
    }
    if (isSellerEU && destinationCountry === 'GB') {
      return SHIPPING_ESTIMATES['EU-GB'].standard;
    }

    // US to/from EU
    if (sellerCountry === 'US' && isBuyerEU) {
      return SHIPPING_ESTIMATES['US-EU'].standard;
    }
    if (isSellerEU && destinationCountry === 'US') {
      return SHIPPING_ESTIMATES['EU-US'].standard;
    }

    // International fallback
    if (isSellerEU) {
      return SHIPPING_ESTIMATES['EU-INTL'].standard;
    }

    return SHIPPING_ESTIMATES['DEFAULT'].standard;
  }

  /**
   * Enrich articles with shipping information
   * @param articles Array of articles
   * @param destinationCountry Buyer's country code
   * @returns Enriched articles with shipping costs
   */
  static enrichWithShipping(
    articles: Article[],
    destinationCountry: string
  ): EnrichedArticle[] {
    return articles.map((article) => {
      const shippingCost = ShippingCalculator.estimateShipping(
        article,
        destinationCountry
      );

      const enriched: EnrichedArticle = {
        ...article,
        shippingCost,
        totalCost: article.price + shippingCost,
        shipsToCountry: true, // Assume true; could be enhanced with real data
      };

      return enriched;
    });
  }

  /**
   * Filter articles that ship to a specific country
   * Note: This is a simplified implementation. In reality, you'd need to
   * query the API for seller shipping methods.
   * @param articles Enriched articles
   * @param destinationCountry Buyer's country code
   * @returns Filtered articles
   */
  static filterByShippingCountry(
    articles: EnrichedArticle[],
    destinationCountry: string
  ): EnrichedArticle[] {
    return articles.filter((article) => {
      // Simplified logic: assume EU sellers ship within EU, etc.
      const sellerCountry = article.seller.country;
      const isSellerEU = EU_COUNTRIES.includes(sellerCountry);
      const isBuyerEU = EU_COUNTRIES.includes(destinationCountry);

      // Same country - always ships
      if (sellerCountry === destinationCountry) {
        return true;
      }

      // Within EU - usually ships
      if (isSellerEU && isBuyerEU) {
        return true;
      }

      // Commercial sellers more likely to ship internationally
      if (article.seller.isCommercial) {
        return true;
      }

      // Conservative assumption for private sellers
      return false;
    });
  }

  /**
   * Group articles by seller and calculate combined shipping
   * @param articles Enriched articles
   * @returns Map of seller ID to articles
   */
  static groupBySeller(
    articles: EnrichedArticle[]
  ): Map<number, EnrichedArticle[]> {
    const groups = new Map<number, EnrichedArticle[]>();

    for (const article of articles) {
      const sellerId = article.seller.idUser;

      if (!groups.has(sellerId)) {
        groups.set(sellerId, []);
      }

      groups.get(sellerId)!.push(article);
    }

    return groups;
  }

  /**
   * Calculate total cost for a group of articles from the same seller
   * Shipping is typically charged once per seller
   * @param articles Articles from the same seller
   * @returns Total cost including single shipping fee
   */
  static calculateGroupTotal(articles: EnrichedArticle[]): number {
    if (articles.length === 0) {
      return 0;
    }

    const itemsTotal = articles.reduce((sum, article) => sum + article.price, 0);
    const shippingCost = articles[0].shippingCost ?? 0;

    return itemsTotal + shippingCost;
  }

  /**
   * Check if a country is in the EU
   * @param countryCode Country code
   * @returns true if country is in EU
   */
  static isEU(countryCode: string): boolean {
    return EU_COUNTRIES.includes(countryCode);
  }
}
