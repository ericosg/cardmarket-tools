# MTG Cheapest Booster Report Generator

## Objective
Generate a comprehensive markdown report analyzing the cheapest MTG booster options across all sets from 2023-2025.

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

Run each command below in sequence. Store the results as you go:

```bash
# 2023 Sets
pnpm start search "Dominaria Remastered" --product-filter "nonsingles"
pnpm start search "Phyrexia: All Will Be One" --product-filter "nonsingles"
pnpm start search "March of the Machine" --product-filter "nonsingles"
pnpm start search "Lord of the Rings: Tales of Middle-earth" --product-filter "nonsingles"
pnpm start search "Commander Masters" --product-filter "nonsingles"
pnpm start search "Wilds of Eldraine" --product-filter "nonsingles"
pnpm start search "The Lost Caverns of Ixalan" --product-filter "nonsingles"

# 2024 Sets
pnpm start search "Ravnica Remastered" --product-filter "nonsingles"
pnpm start search "Murders at Karlov Manor" --product-filter "nonsingles"
pnpm start search "Outlaws of Thunder Junction" --product-filter "nonsingles"
pnpm start search "Modern Horizons 3" --product-filter "nonsingles"
pnpm start search "Assassin's Creed" --product-filter "nonsingles"
pnpm start search "Bloomburrow" --product-filter "nonsingles"
pnpm start search "Duskmourn" --product-filter "nonsingles"
pnpm start search "Foundations" --product-filter "nonsingles"

# 2025 Sets
pnpm start search "Innistrad Remastered" --product-filter "nonsingles"
pnpm start search "Aetherdrift" --product-filter "nonsingles"
pnpm start search "Dragonstorm" --product-filter "nonsingles"
pnpm start search "Final Fantasy" --product-filter "nonsingles"
pnpm start search "Edge of Eternities" --product-filter "nonsingles"
pnpm start search "Spider-Man" --product-filter "nonsingles"
pnpm start search "Avatar" --product-filter "nonsingles"
```

---

## Data to Track

For each set, extract the following information from search results:

### Single Booster Prices (avg column):
- Play Booster / Draft Booster / Set Booster (whichever is cheapest)

### Best Box Value:
- Look for rows with "Booster Box" or "Display" in the name
- Check the **"Per Booster"** column
- Record the lowest €/booster value and total box price

### Additional Context (optional but helpful):
- Prerelease Pack prices
- Fat Pack Bundle prices
- Collector Booster Box prices (for premium comparison)

---

## Report Generation

### Step 1: Create Intermediate Data File

As you process each set, store the data in a markdown file (e.g., `booster-price-data.md`) with this format:

```markdown
## SET NAME
- Single Booster: X.XX€ (Booster Type, avg)
- Best Box Value: **X.XX€/booster** (Product Type, XXX.XX€ total)
- Additional relevant prices...
```

### Step 2: Compile Rankings

From your collected data, create these three rankings:

#### 1. TOP 10 CHEAPEST SINGLE BOOSTERS
- Sort all sets by single booster price (lowest to highest)
- Take top 10
- Format: `**Set Name** - **X.XX €** (Booster Type)`

#### 2. TOP 15 BEST PRICE PER BOOSTER IN DISPLAY BOXES
- Sort all sets by box per-booster price (lowest to highest)
- Take top 15
- Format: `**Set Name** - **X.XX €/booster** (Product Type, XXX.XX € total)`

#### 3. ABSOLUTE WINNERS
- Identify the #1 best box value overall
- Identify the #2 runner-up
- Identify 2-3 most expensive premium sets for contrast
- Include context: single booster price, box price, per-booster price

### Step 3: Generate Final Report

Create the final report with this exact structure:

```markdown
## Complete Analysis: Cheapest Boosters in MTG Sets (2023-2025)

I've searched through all major MTG sets released from 2023 through November 2025. Here's the comprehensive breakdown:

---

### TOP 10 CHEAPEST SINGLE BOOSTERS:

1. **Set Name** - **X.XX €** (Booster Type)
[continue through #10...]

---

### TOP 15 BEST PRICE PER BOOSTER IN DISPLAY BOXES:

1. **Set Name** - **X.XX €/booster** (Product Type, XXX.XX € total)
[continue through #15...]

---

### ABSOLUTE WINNERS:

**Best Overall Value:** **Set Name Product Type**
- Price per booster: **X.XX €**
- Total box price: **XXX.XX €** (description)
- Single booster: **X.XX €**

**Runner-up:** **Set Name Product Type**
[same format...]

**Best Budget 2025 Set:** **Set Name Product Type**
[same format if notably good value...]

---

### MOST EXPENSIVE (for reference):

**Premium Sets:**
- **Set Name** - X.XX € single booster, X.XX-X.XX €/booster in boxes
[list 3-5 premium sets...]

**Note:** Add context about Collector Boosters being more expensive

---

### SUMMARY:

[2-4 paragraphs highlighting:]
- Which year offers best value and why
- How 2025 sets compare to older sets
- Why premium sets cost more
- General trends in Play Booster pricing
```

---

## Output Format

Save the final report as: `MTG_Booster_Price_Analysis_2023-2025.md`

Include:
- Clear section headers with markdown formatting
- Bold emphasis on key prices and set names
- Bullet points for easy scanning
- Context about why certain sets are more expensive
- Data source citation at the bottom

---

## Example Data Points to Look For

### Draft/Play/Set Booster Boxes:
- Look for "Play Booster Box", "Draft Booster Box", "Set Booster Box"
- These usually contain 30-36 boosters
- Per-booster prices typically range from 2.50€ to 10.00€

### Avoid Including:
- Individual sets (Common Set, Rare Set, Mythic Set)
- Tokens
- Commander decks (unless specifically pricing precons)
- Products without clear booster counts

### Focus On:
- Main booster products (Play, Draft, Set)
- Display boxes with clear per-booster pricing
- Prerelease Packs (6 boosters typically)
- Fat Pack Bundles (8-9 boosters typically)

---

## Quality Checks

Before finalizing the report:

✅ All 23 sets have been searched
✅ Rankings are sorted correctly (lowest to highest)
✅ Prices include both per-booster AND total box prices
✅ Single booster prices are clearly distinguished from box prices
✅ Report includes context/analysis, not just raw numbers
✅ Premium sets are identified and explained
✅ Data source and date are cited

---

## Notes

- **Data Source:** CardMarket export data
- **Currency:** All prices in Euros (€)
- **Focus:** Main booster products that represent typical purchase options
- **Goal:** Help users identify the best value sets for cracking packs or drafting
