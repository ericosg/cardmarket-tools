# Future Features

This document tracks planned enhancements and features for the Cardmarket CLI tool.

## Priority 1: High Value Features

### Watch Mode / Price Tracking
**Description:** Monitor card prices over time and get notifications when prices drop below a threshold.

**Implementation Ideas:**
- `pnpm start watch "Black Lotus" --threshold 5000 --interval 1h`
- Store watchlist in local database (SQLite)
- Email/desktop notifications when price thresholds are met
- Track price history and show trends

**Complexity:** Medium
**Value:** High - Users often want to track specific cards for price drops

---

### Export to CSV
**Description:** Export search results to CSV format for spreadsheet analysis.

**Implementation Ideas:**
- `pnpm start search "Lightning Bolt" --export csv --output results.csv`
- Include all relevant fields: name, edition, condition, price, shipping, total, seller info
- Option to append to existing CSV for historical tracking

**Complexity:** Low
**Value:** High - Easy integration with existing workflows

---

### Compare Prices Across Multiple Cards
**Description:** Search for multiple cards at once and compare total costs.

**Implementation Ideas:**
- `pnpm start compare --file decklist.txt --include-shipping`
- Read from a file with card names (one per line or deck format)
- Calculate optimal purchase strategy (minimize shipping by grouping sellers)
- Show total cost for entire purchase

**Complexity:** High
**Value:** Very High - Most buyers purchase multiple cards at once

---

## Priority 2: Convenience Features

### Interactive Mode
**Description:** REPL-style interface for multiple searches without restarting.

**Implementation Ideas:**
- `pnpm start interactive`
- Persistent session with command history
- Tab completion for card names
- Quick filters and sorting

**Complexity:** Medium
**Value:** Medium - Better for power users

---

### Deck Import
**Description:** Import complete decklists and find best prices for all cards.

**Implementation Ideas:**
- Support multiple formats (MTG Arena, MTGO, Moxfield, Archidekt)
- `pnpm start deck import --file deck.txt`
- Calculate total deck cost
- Suggest budget alternatives for expensive cards

**Complexity:** Medium
**Value:** High - Common use case for deck builders

---

### Seller Profiles
**Description:** View detailed seller information and ratings.

**Implementation Ideas:**
- `pnpm start seller <username>`
- Show seller stats: rating, number of sales, countries shipped to
- View seller's inventory
- Filter searches by preferred sellers

**Complexity:** Low
**Value:** Medium - Helps build trust

---

### Price History Graph
**Description:** Visual representation of price trends over time.

**Implementation Ideas:**
- Terminal-based graphs using libraries like `asciichart`
- `pnpm start history "Black Lotus" --days 30`
- Show high, low, average prices
- Identify best time to buy

**Complexity:** Medium
**Value:** High - Helps make informed purchase decisions

---

## Priority 3: Advanced Features

### Auto-Cart Builder
**Description:** Automatically build optimal shopping cart based on best prices and shipping.

**Implementation Ideas:**
- `pnpm start cart --file wishlist.txt --max-budget 500`
- Optimize for: lowest total cost, fewest sellers, fastest shipping
- Generate purchase recommendations
- Handle stock availability

**Complexity:** Very High
**Value:** Very High - Significant time saver

---

### Alerts & Notifications
**Description:** Push notifications for price drops, new listings, or restock.

**Implementation Ideas:**
- Email notifications via SMTP
- Desktop notifications via `node-notifier`
- Webhook support for Discord/Slack integration
- `pnpm start alert add "Force of Will" --max-price 50`

**Complexity:** Medium
**Value:** High - Passive monitoring

---

### Collection Manager
**Description:** Track your personal collection and calculate portfolio value.

**Implementation Ideas:**
- `pnpm start collection add "Black Lotus" --condition NM --quantity 1`
- Calculate total collection value based on current prices
- Track value changes over time
- Compare collection value across different marketplaces

**Complexity:** High
**Value:** Medium - Useful for collectors and investors

---

### Bulk Operations
**Description:** Perform operations on multiple cards efficiently.

**Implementation Ideas:**
- `pnpm start bulk search --file cards.txt --workers 5`
- Parallel API requests with rate limiting
- Progress bar for long operations
- Resume failed operations

**Complexity:** Medium
**Value:** Medium - Important for large searches

---

### Alternative Marketplaces
**Description:** Compare prices across multiple marketplaces (TCGPlayer, eBay, etc.).

**Implementation Ideas:**
- `pnpm start search "Black Lotus" --marketplace all`
- Unified search interface
- Convert currencies automatically
- Consider international shipping

**Complexity:** Very High
**Value:** Very High - Best price discovery

---

### Condition Guide
**Description:** Help users understand card condition grading.

**Implementation Ideas:**
- `pnpm start guide condition`
- Interactive wizard to determine card condition
- Photos/examples of each grade
- Tips for buying at each condition level

**Complexity:** Low
**Value:** Low - Educational, but one-time use

---

## Technical Improvements

### Better Error Handling
- Retry logic for failed API requests
- More descriptive error messages
- Graceful degradation when API is down

### Performance Optimization
- Implement request batching
- More sophisticated caching strategies
- Database for persistent cache

### Testing
- Unit tests for all modules
- Integration tests for API calls
- End-to-end CLI tests

### Configuration Management
- Multiple configuration profiles (dev, prod, test)
- Environment variable support
- Config validation with helpful error messages

---

## Community Features

### Plugin System
**Description:** Allow community-developed extensions.

**Implementation Ideas:**
- Plugin API for custom commands
- Community plugin repository
- Plugin manager: install, update, remove

**Complexity:** Very High
**Value:** High - Extensibility

---

### Web Interface
**Description:** Optional web UI for visual browsing.

**Implementation Ideas:**
- Local web server with REST API
- React/Vue frontend
- Graph visualizations for price trends
- Mobile-responsive design

**Complexity:** Very High
**Value:** Medium - Different audience

---

## API Enhancements

### GraphQL Support
- Implement GraphQL layer over REST API
- More flexible queries
- Reduce over-fetching

### Webhooks
- Real-time updates for price changes
- Event-driven architecture
- Integration with other tools

---

## Priority Legend

- **Priority 1:** Core features that provide immediate value
- **Priority 2:** Convenience features that improve user experience
- **Priority 3:** Advanced features for power users

## Complexity Legend

- **Low:** 1-3 days of development
- **Medium:** 1-2 weeks of development
- **High:** 2-4 weeks of development
- **Very High:** 1+ months of development

---

## Contributing

If you'd like to implement any of these features:

1. Open an issue to discuss the feature
2. Reference this document in your PR
3. Follow the project's coding standards
4. Include tests and documentation

## Feedback

Have ideas for new features? Open an issue with:
- Feature description
- Use case / problem it solves
- Proposed implementation (optional)
- Priority level (your perspective)
