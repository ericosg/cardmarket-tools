# MTG Booster EV Report Generator

## Objective
Generate a comprehensive markdown report analyzing booster box prices, per-booster costs, AND expected value (EV) across all sets from 2023-2025.

## Sets to Analyze (23 sets total)

### 2023 Sets (7 sets):
1. Dominaria Remastered
2. Phyrexia: All Will Be One
3. March of the Machine
4. Lord of the Rings: Tales of Middle-earth
5. Commander Masters
6. Wilds of Eldraine
7. The Lost Caverns of Ixalan

### 2024 Sets (8 sets):
1. Ravnica Remastered
2. Murders at Karlov Manor
3. Outlaws of Thunder Junction
4. Modern Horizons 3
5. Assassin's Creed
6. Bloomburrow
7. Duskmourn: House of Horror
8. Foundations

### 2025 Sets (7 sets):
1. Innistrad Remastered
2. Aetherdrift
3. Tarkir: Dragonstorm (search: "Dragonstorm")
4. Final Fantasy
5. Edge of Eternities
6. Spider-Man
7. Avatar: The Last Airbender (search: "Avatar")

---

## Commands to Execute

Run each command below in sequence with the **--show-ev** flag. Store the results as you go:

```bash
# 2023 Sets
pnpm start search "Dominaria Remastered Play Booster Box" --show-ev
pnpm start search "Phyrexia: All Will Be One Play Booster Box" --show-ev
pnpm start search "March of the Machine Play Booster Box" --show-ev
pnpm start search "Lord of the Rings: Tales of Middle-earth Play Booster Box" --show-ev
pnpm start search "Commander Masters Play Booster Box" --show-ev
pnpm start search "Wilds of Eldraine Play Booster Box" --show-ev
pnpm start search "The Lost Caverns of Ixalan Play Booster Box" --show-ev

# 2024 Sets
pnpm start search "Ravnica Remastered Play Booster Box" --show-ev
pnpm start search "Murders at Karlov Manor Play Booster Box" --show-ev
pnpm start search "Outlaws of Thunder Junction Play Booster Box" --show-ev
pnpm start search "Modern Horizons 3 Play Booster Box" --show-ev
pnpm start search "Assassin's Creed Play Booster Box" --show-ev
pnpm start search "Bloomburrow Play Booster Box" --show-ev
pnpm start search "Duskmourn Play Booster Box" --show-ev
pnpm start search "Foundations Play Booster Box" --show-ev

# 2025 Sets
pnpm start search "Innistrad Remastered Play Booster Box" --show-ev
pnpm start search "Aetherdrift Play Booster Box" --show-ev
pnpm start search "Dragonstorm Play Booster Box" --show-ev
pnpm start search "Final Fantasy Play Booster Box" --show-ev
pnpm start search "Edge of Eternities Play Booster Box" --show-ev
pnpm start search "Spider-Man Play Booster Box" --show-ev
pnpm start search "Avatar Play Booster Box" --show-ev
```

**IMPORTANT:** If a set doesn't have "Play Booster Box", try:
- "Draft Booster Box"
- "Set Booster Box"
- Just the set name with `--product-filter nonsingles --top 1`

---

## Data to Track

For each set, extract the following information from search results:

### Box Pricing Data:
- **Product Name** (e.g., "Bloomburrow Play Booster Box")
- **Average Price** (from "Avg" column)
- **Price per Booster** (from "Per Booster" column)

### EV Data (from --show-ev output):
- **Box EV** (total expected value in singles)
- **EV Ratio** (e.g., "3.35x")
- **Status** (✓ Pos / ~ / ✗ Neg)

### Calculated Metrics:
- **EV Difference** = Box EV - Average Price
- **Profit per Booster** = EV Difference / number of boosters

---

## Report Generation

### Step 1: Create Intermediate Data File

As you process each set, store the data in a markdown file (e.g., `booster-ev-data.md`) with this format:

```markdown
## SET NAME
- Box Price: XXX.XX€ (avg)
- Per Booster: X.XX€
- Box EV: XXX.XX€
- EV Ratio: X.XXx
- Status: ✓ Pos / ~ / ✗ Neg
- EV Difference: +XXX.XX€ or -XX.XX€
- Profit/Booster: +X.XX€ or -X.XX€
```

### Step 2: Compile Rankings

From your collected data, create these rankings:

#### 1. TOP 10 HIGHEST EV RATIO BOXES
- Sort by EV Ratio (highest to lowest)
- Take top 10
- Format: `**Set Name** - **X.XXx EV Ratio** (€XXX box, €XXX EV, +€XX difference)`

#### 2. TOP 10 BEST PROFIT PER BOOSTER
- Sort by profit per booster (highest to lowest)
- Take top 10
- Format: `**Set Name** - **+€X.XX per booster** (€X.XX/booster cost, €XXX box EV)`

#### 3. TOP 10 CHEAPEST BOXES WITH POSITIVE EV
- Filter for Status: ✓ Pos (EV Ratio > 1.0)
- Sort by box price (lowest to highest)
- Take top 10
- Format: `**Set Name** - **€XXX.XX** (X.XXx ratio, €XXX EV)`

#### 4. WORST VALUE BOXES (Negative EV)
- Filter for Status: ✗ Neg (EV Ratio < 1.0)
- Sort by EV Ratio (lowest to highest)
- Show worst 5
- Format: `**Set Name** - **X.XXx ratio** (€XXX cost, €XXX EV, -€XX loss)`

### Step 3: Generate Final Report

Create the final report with this exact structure:

```markdown
# MTG Booster Box EV Analysis Report (2023-2025)

**Report Date:** [Current Date]
**Data Source:** Cardmarket Export Data + Scryfall Card Prices
**Sets Analyzed:** 23 sets from 2023-2025
**Currency:** EUR (€)

---

## EXECUTIVE SUMMARY

[2-3 paragraphs covering:]
- Overall EV trends across years
- Which year offers best value
- How many sets have positive EV
- Notable outliers (very high or very low EV)

---

## TOP 10 HIGHEST EV RATIO BOXES

These boxes have the best expected value relative to their cost:

1. **Set Name** - **X.XXx EV Ratio** (€XXX box, €XXX EV, +€XX difference)
[continue through #10...]

**Analysis:** [1-2 sentences explaining why these sets have high EV]

---

## TOP 10 BEST PROFIT PER BOOSTER

These boxes give you the most profit per pack opened:

1. **Set Name** - **+€X.XX per booster** (€X.XX/booster cost, €XXX box EV)
[continue through #10...]

**Analysis:** [1-2 sentences explaining the significance]

---

## TOP 10 CHEAPEST BOXES WITH POSITIVE EV

Budget-friendly boxes that still have positive expected value:

1. **Set Name** - **€XXX.XX** (X.XXx ratio, €XXX EV)
[continue through #10...]

**Analysis:** [1-2 sentences about budget value]

---

## WORST VALUE BOXES (Negative EV)

These boxes have the worst expected value (lose money on average):

1. **Set Name** - **X.XXx ratio** (€XXX cost, €XXX EV, -€XX loss)
[continue through #5...]

**Analysis:** [1-2 sentences explaining why - e.g., premium collectors sets, low print run]

---

## DETAILED SET-BY-SET BREAKDOWN

### 2023 Sets

#### Set Name
- **Box Price:** €XXX.XX (avg)
- **Per Booster:** €X.XX
- **Box EV:** €XXX.XX
- **EV Ratio:** X.XXx [Status emoji]
- **Expected Profit/Loss:** +/-€XX.XX per box (+/-€X.XX per booster)

[Repeat for all 2023 sets...]

### 2024 Sets

[Same format for all 2024 sets...]

### 2025 Sets

[Same format for all 2025 sets...]

---

## KEY INSIGHTS

### By Year:
- **2023:** [Average EV ratio, notable sets]
- **2024:** [Average EV ratio, notable sets]
- **2025:** [Average EV ratio, notable sets]

### By Set Type:
- **Standard Sets:** [EV trends]
- **Remastered Sets:** [EV trends]
- **Universes Beyond:** [EV trends]
- **Masters Sets:** [EV trends]

### Investment Considerations:
1. **Best Overall Value:** [Set name and why]
2. **Best Budget Buy:** [Cheapest positive EV box]
3. **Highest Risk/Reward:** [Highest EV ratio]
4. **Avoid for Cracking:** [Worst negative EV]

---

## METHODOLOGY

**EV Calculation:**
- Expected Value based on Scryfall card prices (EUR)
- Uses exact booster collation rules (rarity distributions)
- Bulk threshold: €1.00 (cards below this excluded)
- Foil premiums included
- Data refreshed weekly

**Pricing:**
- Cardmarket average prices (export data)
- Represents typical market cost
- May vary by seller and region

**Limitations:**
- EV assumes perfect singles sales at market price
- Doesn't account for selling fees, shipping, time
- Variance can be significant (lucky/unlucky boxes)
- EV changes as card prices fluctuate

---

## GLOSSARY

- **Box EV:** Total expected value of all cards in the box
- **EV Ratio:** Box EV divided by box cost (>1.0 = positive EV)
- **Profit per Booster:** Expected profit divided by pack count
- **Status:**
  - ✓ Pos: Positive EV (ratio ≥ 1.2)
  - ~: Break even (ratio 1.0-1.2)
  - ✗ Neg: Negative EV (ratio < 1.0)

---

*Report generated using cardmarket-cli with EV calculator*
*Last updated: [Date]*
```

---

## Quality Checks

Before finalizing the report:

✅ All 23 sets have been searched with --show-ev
✅ Rankings are sorted correctly
✅ All metrics calculated (EV, ratio, profit/booster)
✅ Sets with missing EV are noted (if any)
✅ Analysis sections provide context, not just numbers
✅ Methodology section explains calculations
✅ Executive summary highlights key findings
✅ Data source and limitations clearly stated

---

## Notes

- **First Time:** Run `pnpm start update-data --scryfall-only` to download EV data
- **If EV shows "N/A":** Set may not be mapped yet, or not a standard booster box
- **Focus:** Main Play Booster Boxes (most common modern product)
- **Alternative Products:** Draft/Set Booster Boxes if Play Boosters unavailable
- **Data Age:** Check Scryfall data age (should be <7 days for accurate EV)
- **Output:** Save final report as `MTG_Booster_EV_Analysis_2023-2025.md`
