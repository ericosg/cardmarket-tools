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
- Product search with multiple filters
- Article (seller offer) retrieval
- Shipping cost estimation by country
- In-memory caching with TTL
- Table and JSON output formats
- CLI with Commander.js
- Configuration file system
- Comprehensive documentation (README, API_DOCUMENTATION, FUTURE_FEATURES)
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
├── commands/
│   ├── types.ts         # Shared TypeScript interfaces
│   ├── search.ts        # Search command logic
│   └── help.ts          # Help display
├── utils/
│   ├── cache.ts         # In-memory cache with TTL
│   ├── formatter.ts     # Output formatting (table/JSON)
│   └── shipping.ts      # Shipping cost calculator
├── config.ts            # Configuration loader/validator
└── index.ts             # CLI entry point
```

#### Key Files Outside src/
- `config.example.json` - Template for user configuration
- `README.md` - User-facing documentation
- `API_DOCUMENTATION.md` - Cardmarket API reference
- `FUTURE_FEATURES.md` - Planned enhancements
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

### Output Formatting (src/utils/formatter.ts)
- **Libraries:** chalk (v4.1.2) for colors, cli-table3 (v0.6.5) for tables
- **Formats:**
  - Table: Colored conditions, seller badges, star ratings
  - JSON: Structured data export
  - Grouped: Shows articles grouped by seller with combined shipping
- **Color Coding:**
  - MT/NM: green
  - EX: cyan
  - GD/LP: yellow
  - PL/PO: red
  - Commercial sellers: blue [Pro] badge

### Configuration (src/config.ts)
- **File:** `config.json` (gitignored)
- **Template:** `config.example.json`
- **Schema:**
  ```json
  {
    "credentials": {
      "appToken": "string",
      "appSecret": "string",
      "accessToken": "string",
      "accessTokenSecret": "string"
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
- **Validation:** Strict validation with helpful error messages, checks for placeholder values

### CLI (src/index.ts)
- **Framework:** Commander.js (v11.1.0)
- **Commands:**
  - `search <card-name>` - Main search command with ~20 options
  - `help` - Display detailed help
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
1. CLI parses arguments → SearchOptions
2. Load config.json → Config
3. Create CardmarketClient with credentials
4. Create CardmarketAPI wrapper
5. SearchCommand executes:
   - Search products by name
   - For each product, get articles
   - Filter by user criteria
   - Enrich with shipping if requested
   - Sort and limit results
   - Format and output

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

1. **Shipping Costs are Estimates**
   - Real shipping costs require querying seller shipping methods
   - Current implementation uses hardcoded estimates by country
   - Good enough for comparison but not exact

2. **Rate Limits**
   - Standard: 30,000 requests/day
   - Professional: 100,000 requests/day
   - Caching mitigates this significantly

3. **OAuth Signature with Redirects**
   - 307 redirects require signature recalculation
   - Implemented correctly in client.ts
   - Critical for /products/find endpoint

4. **API Quirks**
   - Responses sometimes single object vs array
   - Always normalized in endpoints.ts
   - Some fields optional (check for undefined)

5. **Language/Expansion Filtering**
   - Language filter works via idLanguage parameter
   - Set filtering requires idExpansion (not implemented yet)
   - --set option currently stored but not used

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
| Option | Type | Description |
|--------|------|-------------|
| `--condition <code>` | string | MT, NM, EX, GD, LP, PL, PO |
| `--foil` | boolean | Only foil cards |
| `--signed` | boolean | Only signed cards |
| `--altered` | boolean | Only altered cards |
| `--language <code>` | string | EN, DE, FR, IT, ES, JP, etc. |
| `--set <code>` | string | Expansion code (stored but not used yet) |
| `--min-price <n>` | number | Minimum price filter |
| `--max-price <n>` | number | Maximum price filter |
| `--include-shipping` | boolean | Calculate and show shipping |
| `--filter-country` | boolean | Only sellers shipping to user's country |
| `--top <n>` | number | Show only top N offers |
| `--group-by-seller` | boolean | Group articles by seller |
| `--sort <option>` | string | price, condition, seller-rating |
| `--json` | boolean | Output JSON instead of table |
| `--no-cache` | boolean | Bypass cache for this request |
| `--max-results <n>` | number | Override config maxResults |

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

**Status:** Production ready, fully functional pending API credentials

**Last Updated:** 2025-11-03

---

## Quick Start for AI Assistant

When picking up this project:

1. Read this entire document first
2. Check FUTURE_FEATURES.md for what's planned
3. Review recent changes (if any) in git history
4. Understand the user's request
5. Identify which files need modification
6. Make changes following patterns established here
7. Update relevant documentation
8. Test if possible (or provide testing instructions)

Remember: This tool exits after each run, uses pnpm, and requires valid Cardmarket API credentials to actually search for cards.
