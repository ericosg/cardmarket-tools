import Table from 'cli-table3';
import chalk from 'chalk';
import { EnrichedArticle, Product, SearchResult } from '../commands/types';
import { ExportSearchResult } from '../export/types';

/**
 * Output formatter for search results
 */
export class Formatter {
  /**
   * Format search results as a table
   * @param results Search results
   * @param options Formatting options
   */
  static formatTable(
    results: SearchResult[],
    options: {
      includeShipping?: boolean;
      currency?: string;
    } = {}
  ): string {
    if (results.length === 0) {
      return chalk.yellow('No results found.');
    }

    const { includeShipping = false, currency = 'EUR' } = options;

    const output: string[] = [];

    for (const result of results) {
      // Product header
      output.push('');
      output.push(chalk.bold.cyan(`${result.product.name}`));
      output.push(chalk.gray(`Set: ${result.product.expansionName || 'N/A'}`));

      if (result.product.priceGuide) {
        const pg = result.product.priceGuide;
        output.push(
          chalk.gray(
            `Price Guide: Trend ${Formatter.formatPrice(pg.TREND, currency)} | ` +
            `Low ${Formatter.formatPrice(pg.LOW, currency)} | ` +
            `Avg ${Formatter.formatPrice(pg.AVG, currency)}`
          )
        );
      }

      if (result.articles.length === 0) {
        output.push(chalk.yellow('  No offers available'));
        continue;
      }

      // Articles table
      const headers = ['Condition', 'Foil', 'Language', 'Price', 'Seller', 'Country', 'Rating'];

      if (includeShipping) {
        headers.push('Shipping', 'Total');
      }

      const table = new Table({
        head: headers.map((h) => chalk.bold(h)),
        style: {
          head: [],
          border: [],
        },
      });

      for (const article of result.articles.slice(0, 10)) {
        const row: string[] = [
          Formatter.formatCondition(article.condition),
          article.isFoil ? chalk.yellow('Yes') : 'No',
          article.language.languageName,
          Formatter.formatPrice(article.price, currency),
          Formatter.formatSeller(article.seller.username, article.seller.isCommercial),
          article.seller.country,
          Formatter.formatRating(article.seller.reputation),
        ];

        if (includeShipping) {
          row.push(
            Formatter.formatPrice(article.shippingCost ?? 0, currency),
            chalk.bold(Formatter.formatPrice(article.totalCost ?? article.price, currency))
          );
        }

        table.push(row);
      }

      output.push(table.toString());

      if (result.articles.length > 10) {
        output.push(chalk.gray(`  ... and ${result.articles.length - 10} more offers`));
      }
    }

    return output.join('\n');
  }

  /**
   * Format search results as JSON
   * @param results Search results
   * @returns JSON string
   */
  static formatJSON(results: SearchResult[]): string {
    return JSON.stringify(results, null, 2);
  }

  /**
   * Format a price with currency symbol
   * @param price Price value
   * @param currency Currency code
   * @returns Formatted price string
   */
  private static formatPrice(price: number, currency: string): string {
    const symbols: Record<string, string> = {
      'EUR': '€',
      'USD': '$',
      'GBP': '£',
      'JPY': '¥',
    };

    const symbol = symbols[currency] || currency;
    return `${price.toFixed(2)} ${symbol}`;
  }

  /**
   * Format card condition with color coding
   * @param condition Condition code
   * @returns Formatted condition string
   */
  private static formatCondition(condition: string): string {
    const colors: Record<string, typeof chalk.green> = {
      'MT': chalk.green,
      'NM': chalk.green,
      'EX': chalk.cyan,
      'GD': chalk.yellow,
      'LP': chalk.yellow,
      'PL': chalk.red,
      'PO': chalk.red,
    };

    const colorFn = colors[condition] || chalk.white;
    return colorFn(condition);
  }

  /**
   * Format seller name with badge for commercial sellers
   * @param username Seller username
   * @param isCommercial Whether seller is commercial
   * @returns Formatted seller string
   */
  private static formatSeller(username: string, isCommercial: boolean): string {
    if (isCommercial) {
      return `${username} ${chalk.blue('[Pro]')}`;
    }
    return username;
  }

  /**
   * Format seller rating
   * @param reputation Reputation score (1-5)
   * @returns Formatted rating string
   */
  private static formatRating(reputation: number): string {
    const stars = '★'.repeat(reputation) + '☆'.repeat(5 - reputation);

    if (reputation >= 4) {
      return chalk.green(stars);
    } else if (reputation >= 3) {
      return chalk.yellow(stars);
    } else {
      return chalk.red(stars);
    }
  }

  /**
   * Format an error message
   * @param error Error object or message
   * @returns Formatted error string
   */
  static formatError(error: unknown): string {
    if (error instanceof Error) {
      return chalk.red(`Error: ${error.message}`);
    }

    return chalk.red(`Error: ${String(error)}`);
  }

  /**
   * Format a success message
   * @param message Success message
   * @returns Formatted success string
   */
  static formatSuccess(message: string): string {
    return chalk.green(message);
  }

  /**
   * Format a warning message
   * @param message Warning message
   * @returns Formatted warning string
   */
  static formatWarning(message: string): string {
    return chalk.yellow(message);
  }

  /**
   * Format a product summary
   * @param product Product
   * @returns Formatted product string
   */
  static formatProduct(product: Product): string {
    const lines: string[] = [
      chalk.bold.cyan(product.name),
      chalk.gray(`Set: ${product.expansionName || 'N/A'}`),
      chalk.gray(`Category: ${product.categoryName}`),
    ];

    if (product.rarity) {
      lines.push(chalk.gray(`Rarity: ${product.rarity}`));
    }

    if (product.priceGuide) {
      const pg = product.priceGuide;
      lines.push('');
      lines.push(chalk.bold('Price Guide:'));
      lines.push(`  Trend: ${pg.TREND}`);
      lines.push(`  Average: ${pg.AVG}`);
      lines.push(`  Low: ${pg.LOW}`);
      lines.push(`  Low (Ex+): ${pg.LOWEX}`);
    }

    return lines.join('\n');
  }

  /**
   * Format articles grouped by seller
   * @param groups Map of seller ID to articles
   * @param currency Currency code
   * @returns Formatted string
   */
  static formatGroupedBySeller(
    groups: Map<number, EnrichedArticle[]>,
    currency: string = 'EUR'
  ): string {
    const output: string[] = [];

    output.push(chalk.bold.cyan('Articles Grouped by Seller:'));
    output.push('');

    for (const [, articles] of groups.entries()) {
      const seller = articles[0].seller;
      const itemsTotal = articles.reduce((sum, a) => sum + a.price, 0);
      const shipping = articles[0].shippingCost ?? 0;
      const total = itemsTotal + shipping;

      output.push(
        chalk.bold(
          `${Formatter.formatSeller(seller.username, seller.isCommercial)} ` +
          `(${seller.country}) ${Formatter.formatRating(seller.reputation)}`
        )
      );

      for (const article of articles) {
        output.push(
          `  ${article.productName || 'Card'} - ` +
          `${article.condition} - ` +
          `${Formatter.formatPrice(article.price, currency)}`
        );
      }

      output.push(chalk.gray(`  Items: ${Formatter.formatPrice(itemsTotal, currency)}`));
      output.push(chalk.gray(`  Shipping: ${Formatter.formatPrice(shipping, currency)}`));
      output.push(chalk.bold(`  Total: ${Formatter.formatPrice(total, currency)}`));
      output.push('');
    }

    return output.join('\n');
  }

  /**
   * Format export search results as a table
   * @param results Export search results
   * @param options Formatting options
   */
  static formatExportTable(
    results: ExportSearchResult[],
    options: {
      currency?: string;
      dataSource?: string;
    } = {}
  ): string {
    if (results.length === 0) {
      return chalk.yellow('No results found.');
    }

    const { currency = 'EUR', dataSource } = options;

    const output: string[] = [];

    // Data source indicator
    if (dataSource) {
      output.push('');
      output.push(chalk.gray(`Data source: ${dataSource}`));
      output.push('');
    }

    // Create table
    const table = new Table({
      head: [
        chalk.bold('Card Name'),
        chalk.bold('Expansion'),
        chalk.bold('Trend'),
        chalk.bold('Low'),
        chalk.bold('Avg'),
        chalk.bold('Foil Trend'),
      ].map((h) => h),
      style: {
        head: [],
        border: [],
      },
      colWidths: [40, 20, 12, 12, 12, 12],
    });

    for (const result of results) {
      const { product, priceGuide } = result;

      const row: string[] = [
        product.name,
        product.categoryName || 'N/A',
        priceGuide ? Formatter.formatPrice(priceGuide.trend, currency) : 'N/A',
        priceGuide ? Formatter.formatPrice(priceGuide.low, currency) : 'N/A',
        priceGuide ? Formatter.formatPrice(priceGuide.avg, currency) : 'N/A',
        priceGuide && priceGuide['trend-foil'] !== null
          ? Formatter.formatPrice(priceGuide['trend-foil'], currency)
          : 'N/A',
      ];

      table.push(row);
    }

    output.push(table.toString());

    return output.join('\n');
  }

  /**
   * Format export search results as JSON
   * @param results Export search results
   * @returns JSON string
   */
  static formatExportJSON(results: ExportSearchResult[]): string {
    return JSON.stringify(results, null, 2);
  }
}
