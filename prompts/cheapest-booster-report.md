# MTG Cheapest Booster Report Generator

## Objective
Generate a comprehensive markdown report analyzing the cheapest MTG booster options across recent sets from the past 2-3 years.

## Instructions

### Step 1: Find Recent MTG Sets
Use web search to find all MTG sets released in the last 2-3 years (2023-present). Search for:
- "MTG sets released 2023 2024 2025"
- "Magic the Gathering latest set releases"
- Look for standard sets, masters sets, special releases, and universes beyond products

Create a list of all sets with their release dates.

### Step 2: Search Each Set
For each set found, run the following command:
```bash
pnpm start search "[SET NAME]" --product-filter "nonsingles"
```

Track the following data points for each set:
- Cheapest single booster price (look at Play Booster, Draft Booster, Set Booster)
- Best price per booster in display boxes (check the "Per Booster" column)
- Total box price for the best value option

### Step 3: Compile Data
Create three rankings:

1. **TOP 10 CHEAPEST SINGLE BOOSTERS** (by individual pack price)
   - Format: Set Name - Price € (Booster Type)
   - Sort by lowest to highest price

2. **TOP 15 BEST PRICE PER BOOSTER IN DISPLAY BOXES**
   - Format: Set Name - Price/booster € (Product Type, Total Price €)
   - Sort by lowest to highest per-booster price
   - Include the "Per Booster" calculation from the search results

3. **ABSOLUTE WINNERS**
   - Identify the best overall value (lowest per-booster price in a box)
   - Identify the runner-up
   - Identify the most expensive sets for comparison

### Step 4: Generate Markdown Report

Use this structure:

```markdown
## Complete Analysis: Cheapest Boosters in MTG Sets (YYYY-YYYY)

I've searched through all major MTG sets released in [timeframe]. Here's the comprehensive breakdown:

### TOP 10 CHEAPEST SINGLE BOOSTERS:

1. **Set Name** - X.XX € (Booster Type)
[continue ranking...]

### TOP 15 BEST PRICE PER BOOSTER IN DISPLAY BOXES:

1. **Set Name** - **X.XX €/booster** (Product Type, Total € total)
[continue ranking...]

### ABSOLUTE WINNERS:

**Best Overall Value:** **Set Name Product Type**
- Price per booster: X.XX €
- Total box price: X.XX € (low)
- Single booster: X.XX € (additional context)

**Runner-up:** **Set Name Product Type**
[same format...]

**Most Expensive (for reference):**
- **Set Name** - X.XX € single booster, X.XX-X.XX €/booster in boxes
[list 2-3 expensive sets...]

### SUMMARY:
[2-3 sentence summary highlighting which release years/types offer best value and why premium sets are more expensive]
```

### Step 5: Data Quality Notes
- Focus on Play Boosters, Draft Boosters, and Set Boosters (main products)
- Exclude special products like Collector Boosters unless they're competitively priced
- For the "Per Booster" calculation, use the display box results
- Always cite both single booster prices and box prices for best value determination
- Note when a set has extremely low stock or unusual pricing

## Output Format
Present the final report in clean markdown with clear section headers, bullet points, and bold emphasis on key findings.

## Example Search Commands
```bash
pnpm start search "Duskmourn" --product-filter "nonsingles"
pnpm start search "Bloomburrow" --product-filter "nonsingles"
pnpm start search "Modern Horizons 3" --product-filter "nonsingles"
pnpm start search "Murders at Karlov Manor" --product-filter "nonsingles"
```
