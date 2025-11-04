#!/usr/bin/env node

import { Command } from 'commander';
import { ConfigLoader } from './config';
import { SearchCommand } from './commands/search';
import { HelpCommand } from './commands/help';
import { Formatter } from './utils/formatter';
import { SearchOptions, CardCondition, SortOption } from './commands/types';
import { ExportDownloader } from './export/downloader';

const program = new Command();

program
  .name('cardmarket')
  .description('CLI tool for searching Magic: The Gathering cards on Cardmarket')
  .version('1.0.0');

// Search command
program
  .command('search <card-name>')
  .description('Search for a card on Cardmarket')
  .option('--condition <code>', 'Card condition (MT, NM, EX, GD, LP, PL, PO)')
  .option('--foil', 'Only foil cards')
  .option('--signed', 'Only signed cards')
  .option('--altered', 'Only altered cards')
  .option('--language <code>', 'Card language (EN, DE, FR, IT, ES, JP, etc.)')
  .option('--set <code>', 'Expansion set code')
  .option('--min-price <number>', 'Minimum price', parseFloat)
  .option('--max-price <number>', 'Maximum price', parseFloat)
  .option('--include-shipping', 'Include shipping costs')
  .option('--filter-country', 'Only show sellers who ship to your country')
  .option('--top <number>', 'Show top N offers', parseInt)
  .option('--group-by-seller', 'Group articles by seller')
  .option('--sort <option>', 'Sort by: price, condition, seller-rating')
  .option('--json', 'Output in JSON format')
  .option('--no-cache', 'Disable caching for this request')
  .option('--max-results <number>', 'Maximum number of results', parseInt)
  .option('--live', 'Force live API data instead of export')
  .option('--show-foil', 'Show foil price column (overrides hideFoil preference)')
  .option('--hide-per-booster', 'Hide per-booster price column (overrides showPerBooster preference)')
  .action(async (cardName: string, options: Record<string, unknown>) => {
    try {
      // Load configuration
      const config = ConfigLoader.load();

      // Build search options
      const searchOptions: SearchOptions = {
        condition: options.condition as CardCondition | undefined,
        foil: options.foil as boolean | undefined,
        signed: options.signed as boolean | undefined,
        altered: options.altered as boolean | undefined,
        language: options.language as string | undefined,
        set: options.set as string | undefined,
        minPrice: options.minPrice as number | undefined,
        maxPrice: options.maxPrice as number | undefined,
        includeShipping: options.includeShipping as boolean | undefined,
        filterCountry: options.filterCountry as boolean | undefined,
        top: options.top as number | undefined,
        groupBySeller: options.groupBySeller as boolean | undefined,
        sort: options.sort as SortOption | undefined,
        json: options.json as boolean | undefined,
        noCache: options.cache === false,
        maxResults: options.maxResults as number | undefined,
        live: options.live as boolean | undefined,
        showFoil: options.showFoil as boolean | undefined,
        hidePerBooster: options.hidePerBooster as boolean | undefined,
      };

      // Validate options
      SearchCommand.validateOptions(searchOptions);

      // Execute search
      const searchCommand = new SearchCommand(config);
      await searchCommand.execute(cardName, searchOptions);

    } catch (error) {
      console.error(Formatter.formatError(error));
      process.exit(1);
    }
  });

// Update-data command
program
  .command('update-data')
  .description('Download/update export data files')
  .option('-f, --force', 'Force download even if data is recent')
  .action(async (options: Record<string, unknown>) => {
    try {
      const force = options.force as boolean || false;

      console.log('Updating export data...\n');

      const result = await ExportDownloader.downloadAll(force);

      if (result.productsSinglesDownloaded) {
        console.log('✓ Singles catalog updated');
      } else {
        console.log('✓ Singles catalog is up to date');
      }

      if (result.productsNonsinglesDownloaded) {
        console.log('✓ Sealed products catalog updated');
      } else {
        console.log('✓ Sealed products catalog is up to date');
      }

      if (result.priceGuideDownloaded) {
        console.log('✓ Price guide updated');
      } else {
        console.log('✓ Price guide is up to date');
      }

      const status = ExportDownloader.getDataStatus();
      console.log(`\nData status:`);
      console.log(`  Singles age: ${status.productsSinglesAge ? Math.floor(status.productsSinglesAge) + 'h' : 'N/A'}`);
      console.log(`  Sealed products age: ${status.productsNonsinglesAge ? Math.floor(status.productsNonsinglesAge) + 'h' : 'N/A'}`);
      console.log(`  Price guide age: ${status.priceGuideAge ? Math.floor(status.priceGuideAge) + 'h' : 'N/A'}`);

    } catch (error) {
      console.error(Formatter.formatError(error));
      process.exit(1);
    }
  });

// Help command
program
  .command('help')
  .description('Display detailed help information')
  .action(() => {
    HelpCommand.display();
  });

// Handle --help flag
program.on('--help', () => {
  HelpCommand.displayQuick();
});

// Parse arguments
program.parse(process.argv);

// Show help if no command provided
if (process.argv.length === 2) {
  HelpCommand.displayQuick();
}
