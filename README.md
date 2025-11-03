# Cardmarket CLI

A command-line tool for searching Magic: The Gathering cards on Cardmarket (EU) with advanced filtering and shipping cost calculations.

## Features

- 🔍 Search for MTG cards on Cardmarket
- 💰 Compare prices including shipping costs to your location
- 🌍 Filter by seller country and shipping availability
- ⚡ Built-in caching to minimize API rate limits
- 📊 Display results in table or JSON format
- 🎯 Advanced filtering (condition, foil, language, set, price range)
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
  }
}
```

### Configuration Options

- `credentials`: Your Cardmarket API credentials (required)
- `preferences.country`: Your country code for shipping calculations (ISO 3166-1 alpha-2)
- `preferences.currency`: Preferred currency display (EUR, USD, GBP, etc.)
- `preferences.language`: Interface language
- `preferences.maxResults`: Default maximum number of results
- `cache.enabled`: Enable/disable response caching (default: true)
- `cache.ttl`: Cache time-to-live in seconds (default: 3600)

## Usage

### Build the Project

```bash
pnpm run build
```

### Search Commands

**Basic search:**
```bash
pnpm start search "Black Lotus"
```

**Search with filters:**
```bash
# Search for Near Mint cards only
pnpm start search "Lightning Bolt" --condition NM

# Search for foil cards in English
pnpm start search "Tarmogoyf" --foil --language EN

# Search with price range
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
│   ├── commands/
│   │   ├── search.ts            # Search command implementation
│   │   ├── help.ts              # Help command
│   │   └── types.ts             # Shared TypeScript types
│   └── utils/
│       ├── shipping.ts          # Shipping cost calculations
│       ├── formatter.ts         # Output formatting
│       └── cache.ts             # Caching utilities
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

**"Invalid OAuth signature" error:**
- Verify your API credentials in `config.json`
- Ensure your system clock is synchronized (OAuth uses timestamps)

**"Rate limit exceeded" error:**
- Enable caching (default)
- Reduce the number of requests
- Wait for the rate limit to reset (daily)

**No results found:**
- Check card name spelling
- Try without filters first
- Some cards may not be available in the specified condition/language

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## Disclaimer

This tool is not affiliated with or endorsed by Cardmarket. Use responsibly and in accordance with Cardmarket's Terms of Service and API usage policies.
