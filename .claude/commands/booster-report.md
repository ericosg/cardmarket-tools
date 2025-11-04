# Generate MTG Cheapest Booster Report

Generate a comprehensive markdown report analyzing the cheapest MTG booster prices across all recent sets.

## Steps:

1. **Find Recent Sets**: Search the web for all Magic: The Gathering sets released between 2023-2025. Include:
   - Standard sets
   - Masters sets
   - Special releases
   - Universes Beyond products
   - Remastered sets

2. **Search Each Set**: For each set found, run:
   ```
   pnpm start search "[SET NAME]" --product-filter "nonsingles"
   ```

3. **Extract Data**: For each set, record:
   - Cheapest single booster price (Play Booster, Draft Booster, or Set Booster)
   - Best price per booster in display boxes (from "Per Booster" column)
   - Total box price for best value option
   - Product type (Play Booster Box, Draft Booster Box, etc.)

4. **Generate Report** with these sections:

### Report Structure:

```markdown
## Complete Analysis: Cheapest Boosters in MTG Sets (2023-2025)

### TOP 10 CHEAPEST SINGLE BOOSTERS:
[Ranked list: **Set Name** - X.XX € (Booster Type)]

### TOP 15 BEST PRICE PER BOOSTER IN DISPLAY BOXES:
[Ranked list: **Set Name** - **X.XX €/booster** (Product Type, Total € total)]

### ABSOLUTE WINNERS:

**Best Overall Value:** **Set Name Product**
- Price per booster: X.XX €
- Total box price: X.XX €
- Single booster: X.XX €

**Runner-up:** [Same format]

**Most Expensive (for reference):**
- [List 2-3 premium sets with prices]

### SUMMARY:
[2-3 sentences explaining value trends and why certain sets are cheaper/more expensive]
```

## Notes:
- Focus on Play/Draft/Set Boosters (main sealed products)
- Use "Per Booster" column values for display box rankings
- Exclude Collector Boosters unless competitively priced
- Bold key findings and use € currency format
- Sort all rankings from lowest to highest price
