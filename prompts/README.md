# Cardmarket Analysis Prompts

This directory contains reusable prompts for generating various analysis reports using the cardmarket-tools CLI.

## Available Prompts

### 1. Cheapest Booster Report

**Purpose**: Generates a comprehensive markdown report comparing booster prices across all recent MTG sets.

**Files**:
- `cheapest-booster-report.md` - Full detailed instructions and report template
- `generate-booster-report-prompt.txt` - Concise copy-paste version

**Slash Command**:
```
/booster-report
```

The slash command is available at `.claude/commands/booster-report.md`

**Usage**:

**Option 1 - Slash Command (Recommended)**:
```
/booster-report
```

**Option 2 - Copy-Paste Prompt**:
Copy the contents of `generate-booster-report-prompt.txt` and paste into Claude.

**Option 3 - Manual Reference**:
Follow the detailed instructions in `cheapest-booster-report.md`

## Output Example

The report will include:
- ✅ TOP 10 cheapest single boosters across all sets
- ✅ TOP 15 best price-per-booster in display boxes
- ✅ Absolute winners with detailed breakdown
- ✅ Summary of value trends

## Report Features

- 🌐 **Web-powered**: Automatically finds the latest MTG sets
- 💰 **Comprehensive**: Compares prices across 2023-2025 releases
- 📊 **Ranked**: Multiple ranking categories for different purchase types
- 📝 **Markdown**: Clean, formatted output ready to share
- 🎯 **Actionable**: Clear winners and value recommendations

## Adding New Prompts

To add a new analysis prompt:

1. Create a detailed version in `prompts/[name].md`
2. Create a concise version in `prompts/[name]-prompt.txt`
3. Create a slash command in `.claude/commands/[name].md`
4. Update this README

## Example Output Structure

```markdown
## Complete Analysis: Cheapest Boosters in MTG Sets (2023-2025)

### TOP 10 CHEAPEST SINGLE BOOSTERS:
1. **Murders at Karlov Manor** - 2.49 € (Play Booster)
2. **March of the Machine** - 2.50 € (Draft Booster)
...

### TOP 15 BEST PRICE PER BOOSTER IN DISPLAY BOXES:
1. **Murders at Karlov Manor** - **2.84 €/booster** (Play Booster Box, 89.99 € total)
...

### ABSOLUTE WINNERS:
**Best Overall Value:** **Murders at Karlov Manor Play Booster Box**
- Price per booster: 2.84 €
- Total box price: 89.99 €
...
```

## Notes

- All reports use Euro (€) pricing from Cardmarket
- Data is pulled from export data (updated daily)
- Prices reflect market averages and may fluctuate
- Premium sets (Masters, Horizons) typically cost 2-3x standard sets
