# Cardmarket CLI

A command-line tool for searching Magic: The Gathering cards on Cardmarket (EU) with advanced filtering and shipping cost calculations.

## Features

- 🔍 Search for MTG cards on Cardmarket
- 📦 **Export Data Mode** - Uses daily Cardmarket export files by default (no API calls needed!)
- 💰 Compare prices including shipping costs to your location
- 🌍 Filter by seller country and shipping availability
- ⚡ Dual data sources: Fast export data for basic searches, live API for advanced features
- 📊 Display results in table or JSON format
- 🎯 Advanced filtering (condition, foil, language, set, price range)
- 🔄 Automatic daily data updates with manual refresh option
- 📦 Group offers by seller to optimize shipping

## Prerequisites

- Node.js >= 18.0.0
- pnpm package manager
- Cardmarket API credentials (App Token, App Secret, Access Token, Access Token Secret)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd cardmarket-tools
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a configuration file:
```bash
cp config.example.json config.json
```

4. Edit `config.json` with your Cardmarket API credentials and preferences.

## Getting Cardmarket API Credentials

To use this tool, you need API credentials from Cardmarket:

1. Log in to your Cardmarket account
2. Visit: https://www.cardmarket.com/en/Magic/Account/API
3. Create a new "Dedicated App" or "Widget" application
4. You'll receive:
   - App Token (Consumer Key)
   - App Secret (Consumer Secret)
   - Access Token
   - Access Token Secret

For more details, see:
- [Cardmarket API Overview](https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page)
- [Authentication Guide](https://api.cardmarket.com/ws/documentation/API:Auth_Overview)

## Configuration

Create a `config.json` file in the root directory:

```json
{
  "credentials": {
    "appToken": "your-app-token",
    "appSecret": "your-app-secret",
    "accessToken": "your-access-token",
    "accessTokenSecret": "your-access-token-secret"
  },
  "preferences": {
    "country": "DE",
    "currency": "EUR",
    "language": "en",
    "maxResults": 20
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "export": {
    "enabled": true,
    "autoUpdate": true
  }
}
```

### Configuration Options

- `credentials`: Your Cardmarket API credentials (required for live API mode)
- `preferences.country`: Your country code for shipping calculations (ISO 3166-1 alpha-2)
- `preferences.currency`: Preferred currency display (EUR, USD, GBP, etc.)
- `preferences.language`: Interface language
- `preferences.maxResults`: Default maximum number of results
- `cache.enabled`: Enable/disable response caching (default: true)
- `cache.ttl`: Cache time-to-live in seconds (default: 3600)
- `export.enabled`: Enable export data mode (default: true)
- `export.autoUpdate`: Automatically download export data if missing or old (default: true)

## Data Sources

This tool supports two data sources:

### Export Data (Default)
- **What it is:** Daily snapshots of all MTG products and price trends from Cardmarket
- **Size:** ~41MB (18MB products + 23MB price guide)
- **Update frequency:** Daily (automated download on first run, manual updates available)
- **Storage:** Local `./data` directory (gitignored)
- **Advantages:**
  - ⚡ Extremely fast searches (no API calls)
  - 🆓 No API rate limits
  - 📊 Includes price trends and statistics
- **Limitations:**
  - No individual seller offers
  - No condition/foil/signed filtering
  - No real-time shipping calculations
  - Data refreshed daily (may be slightly outdated)

### Live API (On-Demand)
- **What it is:** Real-time queries to Cardmarket's API
- **Advantages:**
  - 🔴 Live seller offers with real-time availability
  - 🎯 Full filtering (condition, foil, signed, altered)
  - 📦 Real shipping cost estimates
  - ⚡ Most up-to-date prices
- **Limitations:**
  - Requires API credentials
  - Subject to rate limits (30,000 requests/day)
  - Slower than export mode

### Automatic Mode Switching
The tool automatically chooses the best data source:

**Uses Export Data when:**
- Basic card searches (name only)
- Price range filtering
- No shipping calculations needed
- Export mode is enabled (default)

**Switches to Live API when:**
- `--include-shipping` flag is used
- Condition filtering (`--condition NM`)
- Special card attributes (`--foil`, `--signed`, `--altered`)
- Country filtering (`--filter-country`)
- Seller grouping (`--group-by-seller`)
- `--live` flag is explicitly set
- Export mode is disabled

## Usage

### Build the Project

```bash
pnpm run build
```

### Search Commands

**Basic search (uses export data):**
```bash
pnpm start search "Black Lotus"
```

**Update export data:**
```bash
# Update if data is old (>24 hours)
pnpm start update-data

# Force update even if data is recent
pnpm start update-data --force
```

**Force live API mode:**
```bash
# Get real-time seller offers
pnpm start search "Black Lotus" --live

# Live mode with condition filtering
pnpm start search "Mox Pearl" --live --condition NM
```

**Search with filters:**
```bash
# Search for Near Mint cards (switches to API automatically)
pnpm start search "Lightning Bolt" --condition NM

# Search for foil cards in English (uses API)
pnpm start search "Tarmogoyf" --foil --language EN

# Search with price range (uses export data)
pnpm start search "Mox Pearl" --min-price 100 --max-price 500

# Search for specific set
pnpm start search "Force of Will" --set ALL
```

**Include shipping costs:**
```bash
# Show total price including shipping
pnpm start search "Volcanic Island" --include-shipping

# Only show sellers who ship to your country
pnpm start search "Underground Sea" --include-shipping --filter-country

# Show top 10 offers by total cost
pnpm start search "Tundra" --include-shipping --top 10
```

**Output formats:**
```bash
# Table format (default)
pnpm start search "Birds of Paradise"

# JSON format
pnpm start search "Birds of Paradise" --json

# Save to file
pnpm start search "Birds of Paradise" --json > results.json
```

**Advanced options:**
```bash
# Group by seller to optimize shipping
pnpm start search "Sol Ring" --include-shipping --group-by-seller

# Sort results
pnpm start search "Counterspell" --sort price
pnpm start search "Dark Ritual" --sort seller-rating

# Disable cache for fresh results
pnpm start search "Brainstorm" --no-cache
```

### Command Options

| Option | Description | Values |
|--------|-------------|--------|
| `--condition` | Card condition | NM, EX, GD, LP, PL, PO |
| `--foil` | Only foil cards | boolean |
| `--signed` | Only signed cards | boolean |
| `--altered` | Only altered cards | boolean |
| `--language` | Card language | EN, DE, FR, IT, ES, JP, etc. |
| `--set` | Expansion set code | 3-letter set codes |
| `--min-price` | Minimum price | number |
| `--max-price` | Maximum price | number |
| `--include-shipping` | Include shipping costs | boolean |
| `--filter-country` | Filter sellers by shipping to your country | boolean |
| `--top` | Show top N offers | number |
| `--group-by-seller` | Group offers by seller | boolean |
| `--sort` | Sort results | price, condition, seller-rating |
| `--json` | Output in JSON format | boolean |
| `--live` | Force live API mode instead of export data | boolean |
| `--no-cache` | Disable caching for this request | boolean |
| `--max-results` | Maximum results to show | number |

### Help Command

```bash
pnpm start help
pnpm start --help
pnpm start search --help
```

## Examples

**Find the cheapest Near Mint Black Lotus including shipping:**
```bash
pnpm start search "Black Lotus" --condition NM --include-shipping --sort price --top 5
```

**Find foil Lightning Bolts in English under 10 EUR:**
```bash
pnpm start search "Lightning Bolt" --foil --language EN --max-price 10
```

**Export search results to JSON:**
```bash
pnpm start search "Mana Crypt" --json > mana-crypt-prices.json
```

## Project Structure

```
cardmarket-cli/
├── src/
│   ├── index.ts                 # Main CLI entry point
│   ├── config.ts                # Configuration loader
│   ├── api/
│   │   ├── client.ts            # API client with OAuth
│   │   ├── auth.ts              # OAuth signature generation
│   │   └── endpoints.ts         # API endpoint methods
│   ├── export/
│   │   ├── types.ts             # Export data TypeScript types
│   │   ├── downloader.ts        # Export file downloader
│   │   └── searcher.ts          # Export data searcher
│   ├── commands/
│   │   ├── search.ts            # Search command implementation
│   │   ├── help.ts              # Help command
│   │   └── types.ts             # Shared TypeScript types
│   └── utils/
│       ├── shipping.ts          # Shipping cost calculations
│       ├── formatter.ts         # Output formatting
│       └── cache.ts             # Caching utilities
├── data/                        # Export data files (gitignored)
│   ├── products_singles_1.json
│   └── price_guide_1.json
├── config.example.json          # Example configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Development

**Watch mode for development:**
```bash
pnpm run watch
```

**Clean build artifacts:**
```bash
pnpm run clean
```

## API Rate Limits

Cardmarket API has rate limits:
- Standard accounts: 30,000 requests/day
- Professional sellers: 100,000 requests/day

This tool includes built-in caching to minimize API calls. Cache is enabled by default with a 1-hour TTL.

## Documentation

- [API Documentation](./API_DOCUMENTATION.md) - Detailed Cardmarket API reference
- [Future Features](./FUTURE_FEATURES.md) - Planned enhancements

## Official Cardmarket Resources

- [Cardmarket API 2.0 Documentation](https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page)
- [Authentication Guide](https://api.cardmarket.com/ws/documentation/API:Auth_Overview)
- [OAuth Header Format](https://api.cardmarket.com/ws/documentation/API:Auth_OAuthHeader)
- [Products Endpoint](https://api.cardmarket.com/ws/documentation/API_2.0:Products)
- [Articles Endpoint](https://api.cardmarket.com/ws/documentation/API_2.0:Articles)

## Troubleshooting

**"Failed to load export data" error:**
- Run `pnpm start update-data` to download export files
- Check internet connection (files are ~41MB total)
- Verify `./data` directory is writable

**"Export data is more than 24 hours old" warning:**
- Run `pnpm start update-data` to refresh data
- Or use `--live` flag to bypass export data

**"Invalid OAuth signature" error:**
- Verify your API credentials in `config.json`
- Ensure your system clock is synchronized (OAuth uses timestamps)
- Note: Only needed for live API mode, not export mode

**"Rate limit exceeded" error:**
- Use export data mode (default) to avoid rate limits
- Enable caching (default)
- Reduce the number of requests
- Wait for the rate limit to reset (daily)

**No results found:**
- Check card name spelling
- Try without filters first
- Some cards may not be available in the specified condition/language
- Export data only includes singles, not all products

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Disclaimer

This tool is not affiliated with or endorsed by Cardmarket. Use responsibly and in accordance with Cardmarket's Terms of Service and API usage policies.
