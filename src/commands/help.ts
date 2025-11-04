import chalk from 'chalk';
import { ConfigLoader } from '../config';

/**
 * Display help information
 */
export class HelpCommand {
  static display(): void {
    // Load config to show current settings
    let config;
    try {
      config = ConfigLoader.load();
    } catch (error) {
      // Config not available, will show defaults only
      config = null;
    }
    console.log(chalk.bold.cyan('\nCardmarket CLI - Magic: The Gathering Card Search Tool\n'));

    console.log(chalk.bold('USAGE:'));
    console.log('  pnpm start search <card-name> [options]');
    console.log('  pnpm start update-data [-f|--force]');
    console.log('  pnpm start help\n');

    console.log(chalk.bold('EXAMPLES:'));
    console.log('  # Basic search');
    console.log('  pnpm start search "Black Lotus"\n');

    console.log('  # Search with filters');
    console.log('  pnpm start search "Lightning Bolt" --condition NM --foil\n');

    console.log('  # Include shipping costs');
    console.log('  pnpm start search "Tarmogoyf" --include-shipping\n');

    console.log('  # Show top 5 offers sorted by total price');
    console.log('  pnpm start search "Force of Will" --include-shipping --top 5 --sort price\n');

    console.log('  # Export results as JSON');
    console.log('  pnpm start search "Mox Pearl" --json > results.json\n');

    console.log('  # Force live API data instead of export');
    console.log('  pnpm start search "Mana Crypt" --live\n');

    console.log('  # Update export data');
    console.log('  pnpm start update-data\n');

    console.log(chalk.bold('OPTIONS:'));
    console.log(chalk.yellow('  Filtering Options:'));
    console.log('    --condition <code>      Card condition (default: none)');
    console.log('                            Values: MT, NM, EX, GD, LP, PL, PO');
    console.log('    --foil                  Only foil cards (default: false)');
    console.log('    --signed                Only signed cards (default: false)');
    console.log('    --altered               Only altered cards (default: false)');
    console.log('    --language <code>       Card language (default: all)');
    console.log('                            Values: EN, DE, FR, IT, ES, JP, etc.');
    console.log('    --set <code>            Expansion set code (default: all)');
    console.log('    --min-price <number>    Minimum price (default: none)');
    console.log('    --max-price <number>    Maximum price (default: none)');
    console.log(`    --product-filter <type> Filter by product type (current: ${config?.preferences.productFilter || 'both'})`);
    console.log('                            Values: singles, nonsingles, both\n');

    console.log(chalk.yellow('  Shipping Options (Forces Live API):'));
    console.log('    --include-shipping      Include shipping costs in results (default: false)');
    console.log('    --filter-country        Only show sellers who ship to your country (default: false)');
    console.log('    --group-by-seller       Group articles by seller (default: false)\n');

    console.log(chalk.yellow('  Display Options:'));
    console.log('    --top <number>          Show only top N offers (default: all)');
    console.log(`    --sort <option>         Sort by: price, condition, seller-rating (export mode default: ${config?.preferences.defaultSort || 'avg'})`);
    console.log('    --json                  Output in JSON format (default: table)');
    console.log(`    --max-results <number>  Maximum number of results (current: ${config?.preferences.maxResults || 20})`);
    console.log(`    --show-foil             Show foil price column (current: ${config?.preferences.hideFoil === false ? 'shown' : 'hidden'})`);
    console.log(`    --hide-per-booster      Hide per-booster price column (current: ${config?.preferences.showPerBooster === false ? 'hidden' : 'shown'})\n`);

    console.log(chalk.yellow('  Data Source Options:'));
    console.log(`    --live                  Force live API data (export mode current: ${config?.export.enabled !== false ? 'enabled' : 'disabled'})`);
    console.log(`    --no-cache              Disable API caching for this request (cache current: ${config?.cache.enabled !== false ? 'enabled' : 'disabled'})\n`);

    console.log(chalk.yellow('  Other Options:'));
    console.log('    --help, -h              Show this help message\n');

    console.log(chalk.bold('CONDITION CODES:'));
    console.log('  MT - Mint          Perfect condition');
    console.log('  NM - Near Mint     Very minor imperfections');
    console.log('  EX - Excellent     Minor wear visible');
    console.log('  GD - Good          Moderate wear');
    console.log('  LP - Light Played  Noticeable wear');
    console.log('  PL - Played        Heavy wear');
    console.log('  PO - Poor          Severe wear, damaged\n');

    console.log(chalk.bold('DATA SOURCES:'));
    console.log(`  By default, searches use cached export data (current: ${config?.export.enabled !== false ? 'enabled' : 'disabled'})`);
    console.log(`  Product filter: ${config?.preferences.productFilter || 'both'} (singles, nonsingles, or both)`);
    console.log('  Export data includes: singles AND sealed products (boosters, boxes, etc.), prices, trends');
    console.log('  Export data does NOT include: individual seller offers, conditions, shipping');
    console.log(`  Export data is sorted by ${config?.preferences.defaultSort || 'avg'} price by default (configurable in config.json)`);
    console.log('  Use --live for real-time seller offers and shipping calculations');
    console.log('  Use --include-shipping to automatically use live API data\n');

    console.log(chalk.bold('COMMANDS:'));
    console.log('  search <name>        Search for cards');
    console.log('  update-data          Download/update export data files');
    console.log('  help                 Show this help message\n');

    console.log(chalk.bold('CONFIGURATION:'));
    console.log('  Configuration file: config.json');
    console.log('  Create from template: cp config.example.json config.json');
    console.log('  Edit with your preferences and API credentials (optional)\n');
    console.log('  Current configuration:');
    console.log(`    preferences.country          Your country (current: ${config?.preferences.country || 'DE'})`);
    console.log(`    preferences.currency         Display currency (current: ${config?.preferences.currency || 'EUR'})`);
    console.log(`    preferences.language         Interface language (current: ${config?.preferences.language || 'en'})`);
    console.log(`    preferences.maxResults       Maximum results per search (current: ${config?.preferences.maxResults || 20})`);
    console.log(`    preferences.defaultSort      Export sort order (current: ${config?.preferences.defaultSort || 'avg'})`);
    console.log(`                                 Options: trend, low, avg, name, none`);
    console.log(`    preferences.hideFoil         Hide foil price column (current: ${config?.preferences.hideFoil !== false ? 'true' : 'false'})`);
    console.log(`    preferences.showPerBooster   Show per-booster pricing (current: ${config?.preferences.showPerBooster !== false ? 'true' : 'false'})`);
    console.log(`    preferences.productFilter    Product type filter (current: ${config?.preferences.productFilter || 'both'})`);
    console.log(`                                 Options: singles, nonsingles, both`);
    console.log(`    cache.enabled                Enable caching (current: ${config?.cache.enabled !== false ? 'true' : 'false'})`);
    console.log(`    cache.ttl                    Cache TTL in seconds (current: ${config?.cache.ttl || 3600})`);
    console.log(`    export.enabled               Enable export data mode (current: ${config?.export.enabled !== false ? 'true' : 'false'})`);
    console.log(`    export.autoUpdate            Auto-download on first run (current: ${config?.export.autoUpdate !== false ? 'true' : 'false'})\n`);

    console.log(chalk.bold('DOCUMENTATION:'));
    console.log('  README.md            - Full documentation');
    console.log('  API_DOCUMENTATION.md - Cardmarket API reference');
    console.log('  FUTURE_FEATURES.md   - Planned enhancements\n');

    console.log(chalk.bold('RESOURCES:'));
    console.log('  Cardmarket API: https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page');
    console.log('  Get API Credentials: https://www.cardmarket.com/en/Magic/Account/API\n');

    console.log(chalk.gray('For more information, see README.md\n'));
  }

  static displayQuick(): void {
    console.log(chalk.bold.cyan('\nCardmarket CLI\n'));
    console.log('Usage: pnpm start search <card-name> [options]');
    console.log('       pnpm start help\n');
    console.log('For detailed help, run: pnpm start help\n');
  }
}
