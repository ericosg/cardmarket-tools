import chalk from 'chalk';

/**
 * Display help information
 */
export class HelpCommand {
  static display(): void {
    console.log(chalk.bold.cyan('\nCardmarket CLI - Magic: The Gathering Card Search Tool\n'));

    console.log(chalk.bold('USAGE:'));
    console.log('  pnpm start search <card-name> [options]');
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

    console.log(chalk.bold('OPTIONS:'));
    console.log(chalk.yellow('  Filtering Options:'));
    console.log('    --condition <code>      Card condition (MT, NM, EX, GD, LP, PL, PO)');
    console.log('    --foil                  Only foil cards');
    console.log('    --signed                Only signed cards');
    console.log('    --altered               Only altered cards');
    console.log('    --language <code>       Card language (EN, DE, FR, IT, ES, JP, etc.)');
    console.log('    --set <code>            Expansion set code');
    console.log('    --min-price <number>    Minimum price');
    console.log('    --max-price <number>    Maximum price\n');

    console.log(chalk.yellow('  Shipping Options:'));
    console.log('    --include-shipping      Include shipping costs in results');
    console.log('    --filter-country        Only show sellers who ship to your country');
    console.log('    --group-by-seller       Group articles by seller\n');

    console.log(chalk.yellow('  Display Options:'));
    console.log('    --top <number>          Show only top N offers');
    console.log('    --sort <option>         Sort by: price, condition, seller-rating');
    console.log('    --json                  Output in JSON format');
    console.log('    --max-results <number>  Maximum number of results\n');

    console.log(chalk.yellow('  Other Options:'));
    console.log('    --no-cache              Disable caching for this request');
    console.log('    --help, -h              Show this help message\n');

    console.log(chalk.bold('CONDITION CODES:'));
    console.log('  MT - Mint          Perfect condition');
    console.log('  NM - Near Mint     Very minor imperfections');
    console.log('  EX - Excellent     Minor wear visible');
    console.log('  GD - Good          Moderate wear');
    console.log('  LP - Light Played  Noticeable wear');
    console.log('  PL - Played        Heavy wear');
    console.log('  PO - Poor          Severe wear, damaged\n');

    console.log(chalk.bold('CONFIGURATION:'));
    console.log('  Configuration file: config.json');
    console.log('  Create from template: cp config.example.json config.json');
    console.log('  Edit with your Cardmarket API credentials\n');

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
