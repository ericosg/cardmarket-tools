# EV Feature - Quick Start Guide

**TL;DR:** This guide provides quick commands and examples for implementing and using the Expected Value feature.

---

## What We're Building

Add **Expected Value (EV) calculations** to show if sealed MTG products are worth opening based on singles prices.

**Example Output:**
```bash
$ pnpm start search "Bloomburrow" --show-ev

┌──────────────────────────────┬───────┬──────────┬─────────┬──────────┬────────┐
│ Product                      │ Avg   │ Per Pack │ Box EV  │ EV Ratio │ Status │
├──────────────────────────────┼───────┼──────────┼─────────┼──────────┼────────┤
│ Play Booster Box (36 packs) │119.90€│ 3.33€    │ 145.50€ │ 1.21x    │ ✓ Pos  │
└──────────────────────────────┴───────┴──────────┴─────────┴──────────┴────────┘
```

---

## Quick Implementation Checklist

### Week 1: Foundation
- [ ] Download Scryfall bulk data (~493 MB)
- [ ] Parse and store card data with rarity + EUR prices
- [ ] Auto-map Cardmarket expansion IDs → Scryfall set codes
- [ ] Create manual mapping override system

### Week 2: Calculation Engine
- [ ] Implement exact booster collation rules (JSON config)
- [ ] Build EV calculator with rarity weighting
- [ ] Add EV to search results (--show-ev flag)

### Week 3: Detailed Reports
- [ ] Create `ev-report` command for full set analysis
- [ ] Add EV formatter with top cards and recommendations
- [ ] Update CLI and configuration

### Week 4: Polish
- [ ] Test against known EV values (MTGGoldfish, etc.)
- [ ] Performance optimization (<2s for reports)
- [ ] Documentation and examples

---

## Key Files to Create

```
data/
  scryfall_cards.json          # ~100 MB - Processed Scryfall data
  expansion_mapping.json       # <1 MB - ID mappings
  booster_collation.json       # ~2 MB - Pack composition rules

src/ev/
  types.ts                     # EV TypeScript types
  scryfall-downloader.ts       # Download Scryfall bulk data
  scryfall-loader.ts           # Load and index data
  expansion-mapper.ts          # Map Cardmarket ↔ Scryfall
  collation-engine.ts          # Booster pack rules
  ev-calculator.ts             # Main EV logic
  ev-formatter.ts              # Report formatting

src/commands/
  ev-report.ts                 # NEW: Detailed report command
  search.ts                    # MODIFY: Add --show-ev support
```

---

## New CLI Commands

```bash
# Search with EV display
pnpm start search "Bloomburrow" --show-ev

# Detailed EV report for a set
pnpm start ev-report "Bloomburrow"
pnpm start ev "BLB"  # Short alias

# Update Scryfall data (weekly)
pnpm start update-data --scryfall-only
```

---

## Core Calculation Logic

```typescript
// Simplified EV calculation
function calculatePackEV(setCode: string): number {
  const mythics = getCards(setCode, 'mythic').filter(c => c.eur >= 1);
  const rares = getCards(setCode, 'rare').filter(c => c.eur >= 1);
  const uncommons = getCards(setCode, 'uncommon').filter(c => c.eur >= 1);
  const commons = getCards(setCode, 'common').filter(c => c.eur >= 1);

  const mythicAvg = average(mythics.map(c => c.eur));
  const rareAvg = average(rares.map(c => c.eur));
  const uncommonAvg = average(uncommons.map(c => c.eur));
  const commonAvg = average(commons.map(c => c.eur));

  // Standard Play Booster weights
  const packEV =
    (mythicAvg * 1/8) +      // 1 mythic per 8 packs
    (rareAvg * 7/8) +        // 7 rares per 8 packs
    (uncommonAvg * 3) +      // 3 uncommons per pack
    (commonAvg * 10);        // 10 commons per pack

  return packEV;
}

const boxEV = calculatePackEV("BLB") * 36;  // 36-pack box
const evRatio = boxEV / boxPrice;           // Compare to sealed price
```

---

## Booster Collation Config Example

```json
{
  "defaultRules": {
    "playBooster": {
      "slots": [
        { "type": "rare_mythic", "count": 1, "distribution": { "rare": 7, "mythic": 1 } },
        { "type": "uncommon", "count": 3 },
        { "type": "common", "count": 10 }
      ]
    }
  },
  "setSpecificRules": {
    "MH3": {
      "customSlots": [
        { "type": "rare_mythic", "count": 2 }
      ],
      "notes": "Double rare per pack"
    }
  }
}
```

---

## Expansion Mapping Strategy

### Auto-Matching (Primary)
```typescript
// Compare set names with fuzzy matching
const cardmarketSet = { id: 574, name: "Bloomburrow" };
const scryfallSet = { code: "BLB", name: "Bloomburrow" };

// Match: 100% confidence
mapping[574] = "BLB";
```

### Manual Override (Fallback)
```json
{
  "manualOverrides": {
    "999": {
      "code": "SLD",
      "name": "Secret Lair Drop",
      "reason": "Name mismatch in Cardmarket"
    }
  }
}
```

---

## Configuration Example

```json
{
  "ev": {
    "enabled": true,
    "autoUpdate": true,
    "updateFrequency": "weekly",
    "bulkCardThreshold": 1.0,
    "showVariance": false,
    "confidenceThreshold": 0.7
  }
}
```

---

## Testing Checklist

**Basic Functionality:**
- [ ] Scryfall download works
- [ ] Data parses correctly
- [ ] Expansion mapping succeeds for major sets
- [ ] EV calculation runs without errors

**Accuracy Validation:**
- [ ] Compare vs MTGGoldfish (within ±10%)
- [ ] Compare vs Dawnglare (within ±10%)
- [ ] Spot-check calculations manually

**Performance:**
- [ ] Data load: <5 seconds
- [ ] Single EV calc: <100ms
- [ ] Full report: <2 seconds
- [ ] Search overhead: <500ms

**Edge Cases:**
- [ ] Sets with no Scryfall data
- [ ] Missing price data
- [ ] Very old sets (pre-2000)
- [ ] Special products (Commander decks)

---

## Common Issues & Solutions

### Issue: Expansion Not Auto-Mapping
**Solution:** Add to `expansion_mapping.json` manually:
```json
{
  "manualOverrides": {
    "123": { "code": "ABC", "name": "Set Name" }
  }
}
```

### Issue: EV Seems Too High/Low
**Checklist:**
1. Are cards <€1 being filtered?
2. Is rarity distribution correct?
3. Are special booster rules applied?
4. Is price data fresh?

### Issue: Slow Performance
**Optimization:**
1. Cache parsed Scryfall data in memory
2. Use Map indices for lookups
3. Pre-calculate rarity averages
4. Lazy-load EV calculator

---

## API Endpoints Used

**Scryfall Bulk Data API:**
```
GET https://api.scryfall.com/bulk-data
Response: List of bulk data files with download URLs

GET [bulk_file_url]
Response: Large JSON file (~493 MB compressed)
```

**No Authentication Required!**

---

## Data Flow Diagram

```
┌─────────────────────┐
│ Scryfall Bulk Data  │  (Weekly download)
│ 493 MB → 100 MB     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Expansion Mapper    │  (Auto + Manual)
│ CM ID → Scryfall    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ EV Calculator       │  (Runtime)
│ Apply collation     │
│ rules               │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Display             │
│ • Search: --show-ev │
│ • Report: ev-report │
└─────────────────────┘
```

---

## Key Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Data Source** | Scryfall Bulk | Free, EUR prices, rarity data |
| **Mapping Strategy** | Auto + Manual | 90%+ auto, fallback for edge cases |
| **Accuracy Level** | Exact collation | Most accurate, meets user requirement |
| **Display Options** | Both flag + report | Flexibility for quick checks and deep dives |
| **Update Frequency** | Weekly | Balance freshness vs bandwidth |
| **Bulk Threshold** | €1.00 | Industry standard |

---

## Next Steps

1. **Start with Phase 1:** Download and parse Scryfall data
2. **Test expansion mapping:** Validate on 10-20 popular sets
3. **Implement basic EV calc:** Start with standard Play Boosters
4. **Add to search:** Integrate --show-ev flag
5. **Build report command:** Detailed set analysis
6. **Test and validate:** Compare against known sources

---

## Useful Links

- **Full Plan:** [EV_IMPLEMENTATION_PLAN.md](./EV_IMPLEMENTATION_PLAN.md)
- **Scryfall API Docs:** https://scryfall.com/docs/api
- **Booster Pack Info:** https://mtg.fandom.com/wiki/Booster_pack
- **MTGGoldfish EV Articles:** https://www.mtggoldfish.com/articles/search?tag=expected+value

---

**Ready to start?** Begin with Phase 1: Download Scryfall data and set up the infrastructure!
