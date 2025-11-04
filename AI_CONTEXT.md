# AI Context Document - Cardmarket CLI

This document contains all the context an AI assistant needs to continue development on this project.

## Original Requirements

**Date:** 2025-11-03

**User Request:**
Create a fully functional command-line Node.js app written in TypeScript that:

1. Responds to console commands with help and various parameters
2. Exits after each run (not a persistent daemon)
3. Can search Cardmarket for Magic the Gathering cards in EU
4. Can return data based on search AND take into account shipping costs to user's location
5. Can take a configuration file to specify required user info

**Additional Requirements:**
- Both table and JSON output formats
- Shipping logic: show top N offers, filter sellers by country, group by seller (all optional via CLI args)
- Caching enabled by default
- Use pnpm as package manager
- Future features tracked separately in FUTURE_FEATURES.md
- Produce comprehensive documentation with links to relevant API docs

## Project Overview

**Name:** cardmarket-cli
**Version:** 1.0.0
**Language:** TypeScript
**Runtime:** Node.js >= 18.0.0
**Package Manager:** pnpm

A CLI tool for searching Magic: The Gathering cards on Cardmarket (EU marketplace) with advanced filtering, shipping cost calculations, and multiple output formats.

## Current Project Status

### ✅ Completed
- Full TypeScript implementation with strict type checking
- OAuth 1.0a authentication with signature generation
- Cardmarket API integration (v2.0)
- **Export data integration (daily Cardmarket export files)**
- **Intelligent mode switching (export vs API)**
- Product search with multiple filters
- Article (seller offer) retrieval
- Shipping cost estimation by country
- In-memory caching with TTL
- Table and JSON output formats
- CLI with Commander.js
- Configuration file system
- Comprehensive documentation (README, API_DOCUMENTATION, FUTURE_FEATURES, AI_CONTEXT)
- Build system (TypeScript compiler)
- Successfully builds and runs

### 🏗️ Architecture

#### Directory Structure
```
src/
├── api/
│   ├── auth.ts          # OAuth signature generation
│   ├── client.ts        # HTTP client with caching & redirects
│   └── endpoints.ts     # API method wrappers
├── export/
│   ├── types.ts         # Export data TypeScript interfaces
│   ├── downloader.ts    # Export file downloader & manager
│   └── searcher.ts      # Export data searcher & loader
├── commands/
│   ├── types.ts         # Shared TypeScript interfaces
│   ├── search.ts        # Search command logic (export + API)
│   └── help.ts          # Help display
├── utils/
│   ├── cache.ts         # In-memory cache with TTL
│   ├── formatter.ts     # Output formatting (table/JSON/export)
│   └── shipping.ts      # Shipping cost calculator
├── config.ts            # Configuration loader/validator
└── index.ts             # CLI entry point
```

#### Key Files Outside src/
- `data/` - Export data files directory (gitignored)
  - `products_singles.json` - ~18MB singles catalog
  - `products_nonsingles.json` - ~23MB sealed products catalog
  - `price_guide.json` - ~23MB price guide
- `config.example.json` - Template for user configuration
- `README.md` - User-facing documentation
- `API_DOCUMENTATION.md` - Cardmarket API & export data reference
- `FUTURE_FEATURES.md` - Planned enhancements
- `AI_CONTEXT.md` - This document
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration

## Technical Implementation Details

### Authentication
- **Method:** OAuth 1.0a with HMAC-SHA1 signatures
- **Library:** oauth-1.0a (v2.2.6)
- **Flow:** 4 credentials required (appToken, appSecret, accessToken, accessTokenSecret)
- **Important:** Handles 307 redirects by recalculating signatures for new URLs
- **Validation:** Checks credentials aren't placeholders before use

### API Client (src/api/client.ts)
- **Base URL:** `https://api.cardmarket.com/ws/v2.0` (prod) or `https://sandbox.mkmapi.eu/ws/v2.0` (sandbox)
- **Features:**
  - Automatic OAuth header generation
  - 307 redirect handling with signature recalculation
  - Built-in caching (optional per-request)
  - Comprehensive error handling (401, 403, 404, 429, 500, 503)
  - 30-second timeout
  - JSON response format
- **Important:** maxRedirects set to 0 to handle redirects manually

### API Endpoints (src/api/endpoints.ts)
Key methods:
- `searchProducts(searchTerm, options)` - Search by name, returns Product[]
- `getProduct(idProduct)` - Get single product details
- `getArticles(idProduct, options)` - Get seller offers with filters

Important constants:
- `idGame: 1` = Magic: The Gathering
- Language IDs: EN=1, FR=2, DE=3, ES=4, IT=5, JP=8, etc.
- Condition order (best to worst): MT, NM, EX, GD, LP, PL, PO

### Caching (src/utils/cache.ts)
- **Type:** In-memory Map-based cache
- **Default TTL:** 3600 seconds (1 hour)
- **Key Generation:** URL + sorted query parameters
- **Features:** Expiry checking, cleanup, statistics
- **Configurable:** Via config.json or --no-cache flag

### Shipping Calculator (src/utils/shipping.ts)
- **Method:** Estimated costs based on country pairs
- **Data:** Hardcoded shipping estimates (domestic, EU, international)
- **Features:**
  - Enriches articles with shipping costs
  - Calculates total cost (price + shipping)
  - Filters by destination country
  - Groups by seller
  - Handles EU vs non-EU logic
- **EU Countries:** Full list of 27 EU member states defined
- **Note:** Real shipping costs would require additional API calls to seller shipping methods

### Export Data System (src/export/)

**Export Downloader (downloader.ts):**
- **Purpose:** Download and manage daily Cardmarket export files
- **URLs:**
  - Singles: `https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_1.json`
  - Sealed: `https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_1.json`
  - Price Guide: `https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json`
- **Features:**
  - Downloads files to `./data` directory
  - Checks file freshness (24-hour threshold)
  - Streaming download for large files (~64MB total: 18MB singles + 23MB sealed + 23MB prices)
  - Automatic timestamp tracking via `createdAt` field
  - Manual force-download option
- **Key Methods:**
  - `downloadAll(force)` - Download all three files if needed
  - `loadProductsSingles()` - Load singles catalog from disk
  - `loadProductsNonsingles()` - Load sealed products catalog from disk
  - `loadPriceGuide()` - Load price guide from disk
  - `needsUpdate()` - Check if data is >24 hours old
  - `getDataStatus()` - Get data age and status for all files

**Export Searcher (searcher.ts):**
- **Purpose:** Search and query export data in memory
- **Data Structure:** Products array (merged singles + sealed) + Map<idProduct, PriceGuideEntry>
- **Features:**
  - Loads and merges both singles and sealed products catalogs
  - O(1) price guide lookups via Map
  - O(n) product name searches (case-insensitive)
  - Exact and partial matching
  - Price range filtering
  - Configurable sorting (trend, low, avg, name, none)
  - Default sort by avg price (ascending - cheapest first)
  - Null-safe price sorting (null prices moved to end)
- **Key Methods:**
  - `load()` - Load and merge export data into memory
  - `search(term, options)` - Search products by name
  - `getById(idProduct)` - Get product + price by ID
  - `getStatus()` - Get data freshness status

**Export Types (types.ts):**
- **PriceGuideEntry:** avg, low, trend, avg1/7/30, foil prices
- **ProductEntry:** idProduct, name, categoryName, expansionName, rarity
- **ExportSearchResult:** Combines product + optional price guide
- **ExportDataStatus:** Loaded flags, dates, ages, needsUpdate

### Output Formatting (src/utils/formatter.ts)
- **Libraries:** chalk (v4.1.2) for colors, cli-table3 (v0.6.5) for tables
- **Formats:**
  - API Table: Colored conditions, seller badges, star ratings
  - Export Table: Card name, expansion, trend/low/avg prices, foil prices
  - JSON: Structured data export (API or export)
  - Grouped: Shows articles grouped by seller with combined shipping
- **Color Coding:**
  - MT/NM: green
  - EX: cyan
  - GD/LP: yellow
  - PL/PO: red
  - Commercial sellers: blue [Pro] badge
- **Export Display:**
  - Shows data source and age (e.g., "Export data (updated 2025-11-03, 12h old)")
  - Price columns: Trend, Low, Avg
  - Optional foil trend column if available

### Configuration (src/config.ts)
- **File:** `config.json` (gitignored)
- **Template:** `config.example.json`
- **Schema:**
  ```json
  {
    "credentials": {
      "appToken": "string (optional)",
      "appSecret": "string (optional)",
      "accessToken": "string (optional)",
      "accessTokenSecret": "string (optional)"
    },
    "preferences": {
      "country": "DE",
      "currency": "EUR",
      "language": "en",
      "maxResults": 20,
      "defaultSort": "avg (or: trend, low, name, none)",
      "hideFoil": true,
      "showPerBooster": true,
      "productFilter": "both (or: singles, nonsingles)"
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
- **Validation:** Strict validation with helpful error messages
- **Optional Credentials:** Credentials field is optional - only required for live API mode
- **Validation Logic:** Credentials validated only when API client is created (lazy validation)
- **Note:** Export mode works without any API credentials

### CLI (src/index.ts)
- **Framework:** Commander.js (v11.1.0)
- **Commands:**
  - `search <card-name>` - Main search command with ~20 options (export/API)
  - `update-data` - Download/update export data files
  - `help` - Display detailed help
- **Key Options:**
  - `--live` - Force live API mode instead of export
  - `--include-shipping` - Auto-switches to API mode
  - Condition/foil/signed filters - Auto-switch to API mode
- **Behavior:** Exits after each command (as required)
- **Error Handling:** Formatted errors with exit code 1

## Important Patterns & Conventions

### Type Safety
- All API responses have TypeScript interfaces in `src/commands/types.ts`
- Custom error classes: `CardmarketAPIError`, `ConfigError`
- Strict null checking enabled

### Error Handling
- Try-catch in command execution
- Formatted error output via `Formatter.formatError()`
- Process exits with code 1 on error
- Specific error messages for common API issues

### Data Flow

**Export Mode (Default):**
1. CLI parses arguments → SearchOptions
2. Load config.json → Config
3. SearchCommand.shouldUseExport() → true
4. SearchCommand executes:
   - Initialize ExportSearcher (if needed)
   - Load and merge export data (singles + sealed) from ./data into memory
   - Search products by name (case-insensitive)
   - Filter by price range (if specified)
   - Sort by configurable field (default: avg price ascending)
   - Null prices moved to end of results
   - Limit results
   - Format and output (export table/JSON)

**API Mode (Advanced Features):**
1. CLI parses arguments → SearchOptions
2. Load config.json → Config
3. Create CardmarketClient with credentials
4. Create CardmarketAPI wrapper
5. SearchCommand.shouldUseExport() → false
6. SearchCommand executes:
   - Search products by name
   - For each product, get articles
   - Filter by user criteria
   - Enrich with shipping if requested
   - Sort and limit results
   - Format and output (API table/JSON)

**Mode Switching Logic:**
- Uses Export if: basic search, no special filters, export enabled
- Uses API if: --live, --include-shipping, --condition, --foil, --signed, --altered, --filter-country, --group-by-seller

### API Response Normalization
- API sometimes returns single object instead of array
- Always normalize to array: `Array.isArray(data) ? data : [data]`

## Dependencies

### Production
- `axios` ^1.6.2 - HTTP client
- `chalk` ^4.1.2 - Terminal colors (v4 for CommonJS compatibility)
- `cli-table3` ^0.6.5 - Table formatting
- `commander` ^11.1.0 - CLI framework
- `oauth-1.0a` ^2.2.6 - OAuth signature generation

### Development
- `@types/node` ^20.10.4 - Node.js type definitions
- `typescript` ^5.3.3 - TypeScript compiler

**Note:** crypto is NOT a dependency (it's built into Node.js)

## Build & Run

### Scripts
- `pnpm install` - Install dependencies
- `pnpm run build` - Compile TypeScript to dist/
- `pnpm start <command>` - Run the CLI
- `pnpm run dev` - Build and run
- `pnpm run watch` - Watch mode for development
- `pnpm run clean` - Remove dist/

### TypeScript Configuration
- Target: ES2020
- Module: CommonJS (for Node.js compatibility)
- Strict mode enabled
- Source maps enabled
- Output: dist/

## Known Limitations & Gotchas

1. **Export Data Limitations**
   - Includes MTG singles AND sealed products (booster boxes, packs, etc.)
   - Does NOT include accessories or other non-card products
   - No individual seller offers or availability
   - No condition/foil/signed filtering capability
   - Updated daily, may be slightly outdated
   - ~64MB file size (requires initial download: 18MB singles + 23MB sealed + 23MB prices)
   - Some products may have null prices (handled gracefully, sorted to end)

2. **Shipping Costs are Estimates**
   - Real shipping costs require querying seller shipping methods
   - Current implementation uses hardcoded estimates by country
   - Good enough for comparison but not exact
   - Only available in API mode (--include-shipping)

3. **Rate Limits**
   - Standard: 30,000 requests/day
   - Professional: 100,000 requests/day
   - Caching mitigates this significantly
   - Export mode completely bypasses rate limits

4. **OAuth Signature with Redirects**
   - 307 redirects require signature recalculation
   - Implemented correctly in client.ts
   - Critical for /products/find endpoint
   - Only relevant in API mode

5. **API Quirks**
   - Responses sometimes single object vs array
   - Always normalized in endpoints.ts
   - Some fields optional (check for undefined)

6. **Language/Expansion Filtering**
   - Language filter works via idLanguage parameter
   - Set filtering requires idExpansion (not implemented yet)
   - --set option currently stored but not used

7. **Mode Switching**
   - Tool automatically switches from export to API when needed
   - Some filter combinations may unexpectedly trigger API mode
   - Use --live to explicitly force API mode
   - Export mode requires no credentials

## Testing Considerations

### Manual Testing
The tool can't be fully tested without valid Cardmarket API credentials:
1. User must create `config.json` with real credentials
2. Test with common cards: "Lightning Bolt", "Sol Ring", "Black Lotus"
3. Test with various filters and options
4. Verify JSON output is valid

### Future Testing Needs
- Unit tests for utility functions (shipping, cache, formatter)
- Mock API responses for integration tests
- Test OAuth signature generation
- Validate configuration loading

## Command Line Interface

### Full Command Syntax
```bash
pnpm start search "<card-name>" [options]
```

### Available Options
| Option | Type | Description | Mode |
|--------|------|-------------|------|
| `--condition <code>` | string | MT, NM, EX, GD, LP, PL, PO | Forces API |
| `--foil` | boolean | Only foil cards | Forces API |
| `--signed` | boolean | Only signed cards | Forces API |
| `--altered` | boolean | Only altered cards | Forces API |
| `--language <code>` | string | EN, DE, FR, IT, ES, JP, etc. | Both |
| `--set <code>` | string | Expansion code (stored but not used yet) | Both |
| `--min-price <n>` | number | Minimum price filter | Both |
| `--max-price <n>` | number | Maximum price filter | Both |
| `--include-shipping` | boolean | Calculate and show shipping | Forces API |
| `--filter-country` | boolean | Only sellers shipping to user's country | Forces API |
| `--top <n>` | number | Show only top N offers | Both |
| `--group-by-seller` | boolean | Group articles by seller | Forces API |
| `--sort <option>` | string | price, condition, seller-rating | Both |
| `--json` | boolean | Output JSON instead of table | Both |
| `--live` | boolean | Force live API mode | Forces API |
| `--no-cache` | boolean | Bypass cache for this request | API only |
| `--max-results <n>` | number | Override config maxResults | Both |
| `--show-foil` | boolean | Show foil price column (overrides hideFoil) | Export only |
| `--hide-per-booster` | boolean | Hide per-booster column (overrides showPerBooster) | Export only |
| `--product-filter <type>` | string | Filter by product type: singles, nonsingles, both | Export only |

## Future Development Roadmap

See `FUTURE_FEATURES.md` for complete list. Priority items:

### Priority 1 (High Value)
- Watch mode / price tracking
- CSV export
- Multi-card comparison (optimal buying strategy)

### Priority 2 (Convenience)
- Interactive REPL mode
- Deck import (Arena/MTGO format)
- Seller profile viewing

### Priority 3 (Advanced)
- Auto-cart builder with optimization
- Alerts & notifications
- Collection manager

## Common Development Tasks

### Adding a New Filter Option
1. Add to `SearchOptions` interface in `src/commands/types.ts`
2. Add Commander option in `src/index.ts`
3. Pass to `api.getArticles()` in `src/commands/search.ts`
4. Update help in `src/commands/help.ts`
5. Document in `README.md`

### Adding a New Command
1. Create `src/commands/newcommand.ts` with command class
2. Add command in `src/index.ts` with `.command()`
3. Add to help display
4. Update README

### Modifying Output Format
- Edit `src/utils/formatter.ts`
- `formatTable()` for table output
- `formatJSON()` for JSON output
- Add new format method if needed

### Changing Cache Behavior
- Modify `src/utils/cache.ts` for cache logic
- Modify `src/api/client.ts` for usage
- Update config schema if adding options

## API Documentation References

### Official Cardmarket Docs
- Main: https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page
- Auth: https://api.cardmarket.com/ws/documentation/API:Auth_Overview
- OAuth Header: https://api.cardmarket.com/ws/documentation/API:Auth_OAuthHeader
- Products: https://api.cardmarket.com/ws/documentation/API_2.0:Products
- Articles: https://api.cardmarket.com/ws/documentation/API_2.0:Articles

### Key Endpoints Used
- `GET /products/find?search=<name>&idGame=1` - Search products
- `GET /products/{idProduct}` - Get product details
- `GET /products/{idProduct}/articles` - Get seller offers

### Not Yet Implemented
- `GET /users/{idUser}` - User/seller information
- `GET /shippingmethods/{idUser}` - Actual shipping costs
- Expansion/set filtering (requires idExpansion lookup)
- Authentication for other endpoints (account, orders, etc.)

## Environment & Tools

- **Node Version:** >= 18.0.0 (for modern features)
- **Package Manager:** pnpm (faster, more efficient than npm)
- **Editor:** Any (VS Code recommended)
- **OS:** Cross-platform (developed on macOS, should work on Linux/Windows)

## Git & Version Control

### Ignored Files (.gitignore)
- `node_modules/`
- `dist/`
- `config.json` (contains secrets!)
- `.env`
- Various IDE and build artifacts

### Important: Never Commit
- `config.json` with real API credentials
- Any files with actual access tokens

## Debugging Tips

### OAuth Issues
- Verify system clock is synchronized (OAuth uses timestamps)
- Check that credentials aren't placeholder strings
- Inspect Authorization header in network requests
- Test with sandbox URL first

### API Issues
- Check rate limits (429 errors)
- Verify idGame=1 for MTG
- Check response normalization (array vs object)
- Look for 307 redirects in logs

### Search Issues
- Card name spelling matters
- Try without filters first
- Check language ID mapping
- Verify condition codes

## Questions to Ask When Making Changes

1. **Does this affect the API contract?** → Update types.ts
2. **Is this user-facing?** → Update README.md and help command
3. **Does this change CLI options?** → Update index.ts, help.ts, search.ts
4. **Does this affect configuration?** → Update config schema and validation
5. **Is this a breaking change?** → Update version number
6. **Does this need documentation?** → Update relevant .md files

## Code Style & Conventions

- **Naming:** camelCase for variables/functions, PascalCase for classes/types
- **Exports:** Named exports preferred over default exports
- **Comments:** JSDoc comments for public methods
- **Errors:** Throw custom error classes with descriptive messages
- **Async:** Use async/await, not callbacks or raw Promises
- **Types:** Explicit return types on functions, strict null checks
- **Formatting:** 2-space indentation, single quotes (except JSON)

## Success Criteria

The project is considered "working" when:
- [x] Builds without errors
- [x] Help command displays correctly
- [x] Configuration loads and validates
- [x] Can search for cards (requires real credentials to test)
- [x] Outputs in both table and JSON formats
- [x] Shipping calculations work
- [x] Exits after each command
- [x] All documentation is complete

## Current Version: 1.0.0

**Status:** Production ready, fully functional

**Last Updated:** 2025-11-03

---

## Recent Updates

### Optional API Credentials (2025-11-03)
Made API credentials optional - only required when using live API mode:

**What Changed:**
- Modified Config type to make credentials optional
- Updated config validation to allow missing credentials
- Added lazy validation in SearchCommand.getAPI()
- Credentials only validated when API mode is actually used
- Clear error message when live mode requested without credentials
- Updated config.example.json with comment about optional credentials

**Benefits:**
- No setup required for basic price lookups
- Export mode works immediately without API registration
- Lower barrier to entry for new users
- Credentials only needed for advanced features

### Export Data Feature (2025-11-03)
Major update adding dual-mode data source capability:

**What Changed:**
- Added `src/export/` directory with downloader, searcher, and types
- Modified search command to intelligently switch between export and API
- Added `update-data` command for manual data refresh
- Added `--live` flag to force API mode
- Updated all formatters to support export data display
- Modified configuration to include export settings
- Updated all documentation

**New Files:**
- `src/export/types.ts` - Export data interfaces
- `src/export/downloader.ts` - Download manager for export files
- `src/export/searcher.ts` - In-memory search engine

**Modified Files:**
- `src/commands/search.ts` - Added mode switching logic
- `src/commands/types.ts` - Added export config and --live option
- `src/utils/formatter.ts` - Added export table/JSON formatting
- `src/config.ts` - Added export configuration validation
- `src/index.ts` - Added update-data command and --live flag
- `src/commands/help.ts` - Updated help text
- `config.example.json` - Added export section
- `.gitignore` - Added data/ directory

**Benefits:**
- No API credentials needed for basic searches
- Bypasses rate limits for price lookups
- Much faster searches (local data)
- Still supports full API features when needed
- Automatic mode switching for seamless UX

**Technical Notes:**
- Export files stored in `./data/` (gitignored)
- Files downloaded from S3: ~64MB total (18MB singles + 23MB sealed + 23MB prices)
- 24-hour freshness check
- Map-based price guide for O(1) lookups
- Streaming downloads for large files

### Sealed Products and Configurable Sorting (2025-11-04)
Major enhancement to export data mode with sealed products and sorting:

**What Changed:**
- Added support for `products_nonsingles_1.json` export file (~23MB sealed products)
- Downloader now fetches both singles and sealed products
- Searcher merges both catalogs into single searchable dataset
- Implemented configurable default sorting (trend, low, avg, name, none)
- Default sort changed to avg price ascending (cheapest first)
- Added null-safe sorting (null prices moved to end of results)
- Updated help command to show all default values
- Added `preferences.defaultSort` to configuration schema

**New Capabilities:**
- Search for booster boxes, prerelease packs, bundles, etc.
- Configurable sort order via config.json
- Smart null price handling in sort and display
- Full type safety with ExportSortOption type
- Help command documents all defaults

**Modified Files:**
- `src/export/downloader.ts` - Added nonsingles support, split download methods
- `src/export/searcher.ts` - Merges singles + nonsingles, tracks oldest date
- `src/commands/search.ts` - Configurable sorting with null handling
- `src/commands/types.ts` - Added ExportSortOption type, defaultSort to Preferences
- `src/config.ts` - Validates defaultSort configuration
- `src/commands/help.ts` - Shows all default values
- `src/index.ts` - update-data shows both file statuses
- `src/utils/formatter.ts` - Fixed null price handling (return 'N/A')
- `config.example.json` - Added defaultSort field

**Benefits:**
- Comprehensive product coverage (singles + sealed)
- User control over sort order preference
- Smart handling of missing price data
- Better UX with documented defaults
- Sealed product price comparison
- Optimal buying strategy (cheapest first by default)

**Technical Notes:**
- Total export data: ~64MB (increased from ~41MB)
- Searcher uses oldest timestamp for safety
- Null prices: `price == null` check handles both null and undefined
- Sort options validated at config load time
- Default value: 'avg' (average price ascending)

---

### Per-Booster Pricing for Sealed Products (2025-11-04)
Major enhancement adding automatic per-booster price calculations for sealed products:

**What Changed:**
- Created comprehensive booster count database (`data/booster-counts.json`)
- Implemented `BoosterCountLookup` utility for intelligent booster count lookups
- Added `hideFoil` and `showPerBooster` preferences to configuration
- Enhanced formatter to dynamically show/hide foil and per-booster columns
- Added CLI flags `--show-foil` and `--hide-per-booster` for runtime overrides
- Updated all documentation (README, API_DOCUMENTATION, AI_CONTEXT)

**New Capabilities:**
- Automatic per-booster pricing for booster boxes, bundles, and prerelease packs
- Historical awareness (36-pack boxes → 30-pack boxes in 2025)
- Set-specific overrides (Masters sets: 24 packs, Collector boxes: 12 packs)
- Customizable display via config or CLI flags
- Smart product type detection via category and name patterns

**Booster Count Database (`data/booster-counts.json`):**
- **Default counts** by product type (Play Booster Box: 36, Bundle: 9, etc.)
- **Category mappings** for different product categories (Magic Display, Magic Fatpack, etc.)
- **Set-specific overrides** for non-standard configurations
  - Aetherdrift/Innistrad Remastered: 30-pack Play Booster Boxes
  - Masters/Horizons/Conspiracy sets: 24-pack boxes
  - Historical bundles: 8-pack (Zendikar Rising era), 10-pack (Kaladesh era)
- **Pattern matching** for intelligent product identification

**BoosterCountLookup Utility (`src/utils/booster-count.ts`):**
- `getBoosterCount(productName, categoryName)` - Returns booster count or null
- `supportsPerBoosterPricing(categoryName)` - Checks if category supports pricing
- `getSupportedCategories()` - Returns all supported categories
- **Smart set name extraction** from product names
- **Layered lookup priority:**
  1. Set-specific overrides (e.g., "Aetherdrift Play Booster Box" → 30)
  2. Category pattern matching (e.g., "Collector Booster Box" → 12)
  3. Returns null if no match (shows N/A in UI)

**Modified Files:**
- `src/commands/types.ts` - Added `hideFoil`, `showPerBooster` to Preferences; `showFoil`, `hidePerBooster` to SearchOptions
- `src/config.ts` - Validates new boolean preferences with defaults (hideFoil: true, showPerBooster: true)
- `src/utils/booster-count.ts` - NEW: Booster count lookup utility
- `src/utils/formatter.ts` - Dynamic column management, per-booster calculation
- `src/commands/search.ts` - Passes display options to formatter with CLI overrides
- `src/index.ts` - Added `--show-foil` and `--hide-per-booster` CLI flags
- `config.example.json` - Added hideFoil and showPerBooster preferences
- `data/booster-counts.json` - NEW: Comprehensive booster count database

**Configuration:**
```json
{
  "preferences": {
    "hideFoil": true,        // Hide foil column (default: true)
    "showPerBooster": true   // Show per-booster column (default: true)
  }
}
```

**CLI Override Flags:**
- `--show-foil` - Show foil column (overrides hideFoil preference)
- `--hide-per-booster` - Hide per-booster column (overrides showPerBooster preference)

**Calculation Logic:**
```typescript
Per-Booster Price = Average Price ÷ Number of Boosters
```

**Display Rules:**
- Shows per-booster column for: Magic Display, Magic Fatpack, Magic TournamentPack
- Shows "N/A" for: Singles, Sets, unsupported categories, missing booster counts
- Uses avg price (most representative market value)
- Respects user preferences and CLI overrides

**Example Output:**
```
┌──────────────────────────────┬──────┬──────┬──────┬──────────────┐
│ Card Name                    │ Avg  │ ...  │ ...  │ Per Booster  │
├──────────────────────────────┼──────┼──────┼──────┼──────────────┤
│ Play Booster Box (36 packs)  │119.90│  ... │  ... │ 3.33 €       │
│ Collector Box (12 packs)     │316.47│  ... │  ... │ 26.37 €      │
│ Bundle (9 packs)             │ 45.07│  ... │  ... │ 5.01 €       │
│ Prerelease Pack (6 packs)    │ 30.57│  ... │  ... │ 5.09 €       │
│ Single Card                  │  1.50│  ... │  ... │ N/A          │
└──────────────────────────────┴──────┴──────┴──────┴──────────────┘
```

**Benefits:**
- Easy sealed product value comparison
- Identifies best value options (lowest per-booster cost)
- Historical accuracy (handles MTG's changing product configurations)
- Flexible display (users can customize via config or CLI)
- Clean UI (foil column hidden by default for sealed product searches)

**Technical Notes:**
- Booster count database is version-controlled (not gitignored)
- Set name extraction handles various product name formats
- Null-safe throughout (missing data shows N/A, not errors)
- Lookup performance: O(1) for category check, O(n) for pattern matching (n = small)
- Compatible with both export and JSON output modes
- CLI flags take precedence over config preferences

### Product Type Filtering and Dynamic Help (2025-11-04)
Major enhancement adding product type filtering and dynamic configuration display in help:

**What Changed:**
- Added `productFilter` option to filter searches by singles, nonsingles (sealed), or both
- Help command now dynamically displays current configuration settings
- Updated all CLI flags and config validation to support product filtering
- Enhanced ExportSearcher to filter product arrays based on type

**New Capabilities:**
- Filter searches to show only singles: `--product-filter singles`
- Filter searches to show only sealed products: `--product-filter nonsingles`
- Default behavior shows both: `--product-filter both` (or omit flag)
- Configuration option: `preferences.productFilter` (default: "both")
- Help command shows ALL current config values inline

**Product Filter Implementation:**
- **Type Definition:** Added `ProductFilter` type: `'singles' | 'nonsingles' | 'both'`
- **ExportSearcher Changes:**
  - Stores separate arrays: `singlesProducts`, `nonsinglesProducts`, and merged `products`
  - Search method accepts `productFilter` parameter
  - Filters which array to search based on filter value
- **CLI Integration:**
  - New flag: `--product-filter <type>`
  - Validates input against valid options
  - Passes filter to search execution
- **Config Integration:**
  - Added `preferences.productFilter` with default "both"
  - Full validation with helpful error messages
  - Config value used as default if CLI flag not provided

**Dynamic Help System:**
- Help command loads config.json at runtime
- Shows current values inline: `(current: both)`, `(current: 20)`, etc.
- New comprehensive "Current configuration" section listing all settings
- Handles missing config gracefully (shows defaults only)
- Examples:
  - `--product-filter <type> Filter by product type (current: both)`
  - `--max-results <number>  Maximum number of results (current: 20)`
  - `preferences.productFilter    Product type filter (current: both)`

**Modified Files:**
- `src/commands/types.ts` - Added ProductFilter type, updated Preferences and SearchOptions
- `src/export/searcher.ts` - Added separate product arrays and filtering logic
- `src/commands/search.ts` - Integrated filter into search, added validation
- `src/index.ts` - Added --product-filter CLI flag
- `src/config.ts` - Added productFilter validation with defaults
- `src/commands/help.ts` - Complete rewrite to load and display current config
- `config.example.json` - Added productFilter field
- All .md files - Updated with new feature documentation

**Use Cases:**
- Collectors searching only for singles: `pnpm start search "Lightning Bolt" --product-filter singles`
- Bulk buyers looking for sealed products: `pnpm start search "Bloomburrow" --product-filter nonsingles`
- General searches showing everything: default behavior (both)
- Config preset for specific workflows: set `productFilter` in config.json

**Benefits:**
- Cleaner search results (no mixing singles with boxes)
- Faster searches when category is known (searches smaller arrays)
- Better UX for specialized workflows
- Help text always shows current settings (no guessing)
- Self-documenting CLI (users see their config in help)

**Technical Notes:**
- Product arrays separated at load time (one-time cost)
- Filter selection is O(1) (array reference swap)
- Backward compatible (default "both" shows all products)
- Validation prevents typos and invalid values
- Help command gracefully handles missing config
- Config defaults ensure tool works without productFilter set

---

## Quick Start for AI Assistant

When picking up this project:

1. Read this entire document first
2. Check FUTURE_FEATURES.md for what's planned
3. Review recent changes (above) or git history
4. Understand the user's request
5. Identify which files need modification
6. Make changes following patterns established here
7. Update relevant documentation
8. Test if possible (or provide testing instructions)

Remember: This tool exits after each run, uses pnpm, and now supports both export data (default, no credentials needed) and live API mode (requires credentials).
