import * as fs from 'fs';
import * as path from 'path';
import { ExpansionMapping } from './types';
import { ScryfallLoader } from './scryfall-loader';
import { ExportDownloader } from '../export/downloader';

/**
 * Maps Cardmarket expansion IDs to Scryfall set codes
 */
export class ExpansionMapper {
  private mappings: Map<number, ExpansionMapping> = new Map();
  private reverseMappings: Map<string, number> = new Map();
  private static readonly MAPPING_FILE = path.join(process.cwd(), 'data', 'expansion_mapping.json');

  /**
   * Initialize mapper with auto-matching and manual overrides
   */
  async initialize(scryfallLoader: ScryfallLoader): Promise<void> {
    console.log('Initializing expansion mapper...');

    // Load existing mappings if available
    this.loadMappingsFromFile();

    // Generate auto-mappings by analyzing card data
    await this.generateAutoMappings(scryfallLoader);

    // Save updated mappings
    this.saveMappings();

    console.log(`✓ Mapped ${this.mappings.size} expansions`);
  }

  /**
   * Map Cardmarket expansionId to Scryfall set code
   */
  getSetCode(expansionId: number): string | null {
    const mapping = this.mappings.get(expansionId);
    return mapping ? mapping.setCode : null;
  }

  /**
   * Reverse: Scryfall code to Cardmarket ID
   */
  getExpansionId(setCode: string): number | null {
    return this.reverseMappings.get(setCode.toUpperCase()) || null;
  }

  /**
   * Get mapping confidence (for diagnostics)
   */
  getMappingConfidence(expansionId: number): number {
    const mapping = this.mappings.get(expansionId);
    return mapping ? mapping.confidence : 0;
  }

  /**
   * Add manual override
   */
  addManualMapping(expansionId: number, setCode: string, setName: string): void {
    const mapping: ExpansionMapping = {
      expansionId,
      setCode: setCode.toUpperCase(),
      setName,
      confidence: 1.0,
      source: 'manual'
    };

    this.mappings.set(expansionId, mapping);
    this.reverseMappings.set(setCode.toUpperCase(), expansionId);
  }

  /**
   * Generate auto-mappings by analyzing card data
   */
  private async generateAutoMappings(scryfallLoader: ScryfallLoader): Promise<void> {
    // Load Cardmarket singles to analyze
    const singlesData = ExportDownloader.loadProductsSingles();
    if (!singlesData) {
      console.warn('⚠ Cardmarket singles data not available for mapping');
      return;
    }

    // Also load nonsingles to get expansion IDs for sealed products
    const nonsinglesData = ExportDownloader.loadProductsNonsingles();

    // Group cards by expansion ID to get sample card names
    const expansionSamples: Map<number, string[]> = new Map();

    for (const product of singlesData.products.slice(0, 50000)) { // Sample first 50k
      if (!expansionSamples.has(product.idExpansion)) {
        expansionSamples.set(product.idExpansion, []);
      }

      const samples = expansionSamples.get(product.idExpansion)!;
      if (samples.length < 20) { // Collect up to 20 sample cards per expansion
        samples.push(product.name);
      }
    }

    // Also sample from nonsingles to ensure sealed product expansions are mapped
    // We'll map these by finding singles with the same expansion name
    if (nonsinglesData) {
      const nonsinglesExpansions = new Map<number, string>();

      // Collect unique expansion IDs from nonsingles
      for (const product of nonsinglesData.products) {
        if (!nonsinglesExpansions.has(product.idExpansion) && !expansionSamples.has(product.idExpansion)) {
          // Extract set name from product name
          // Handles cases like:
          // "Bloomburrow Play Booster Box" -> "Bloomburrow"
          // "Magic: The Gathering Foundations Play Booster Box" -> "Magic: The Gathering Foundations"
          const setNameMatch = product.name.match(/^(.+?)(?:\s+(?:Play|Draft|Set|Collector|Bundle|Booster|Box|Deck|Commander|Prerelease|Fat|Gift|Theme))/i);
          if (setNameMatch) {
            nonsinglesExpansions.set(product.idExpansion, setNameMatch[1].trim());
          }
        }
      }

      // Try to match nonsingles expansion IDs by set name similarity
      for (const [expansionId, setName] of nonsinglesExpansions) {
        const scryfallSets = scryfallLoader.getAllSetCodes();

        for (const setCode of scryfallSets) {
          const setCards = scryfallLoader.getSetCards(setCode);
          if (setCards.length === 0) continue;

          const scryfallSetName = setCards[0].set_name;

          // Simple name match
          if (this.normalizeSetName(setName) === this.normalizeSetName(scryfallSetName)) {
            const mapping: ExpansionMapping = {
              expansionId,
              setCode,
              setName: scryfallSetName,
              confidence: 1.0,
              source: 'auto'
            };

            this.mappings.set(expansionId, mapping);
            this.reverseMappings.set(setCode, expansionId);
            break;
          }
        }
      }
    }

    // Try to match each expansion
    const scryfallSets = scryfallLoader.getAllSetCodes();

    for (const [expansionId, sampleCards] of expansionSamples) {
      // Skip if already mapped manually
      if (this.mappings.has(expansionId) && this.mappings.get(expansionId)!.source === 'manual') {
        continue;
      }

      // Try to find matching Scryfall set
      let bestMatch: { setCode: string; setName: string; confidence: number } | null = null;

      for (const setCode of scryfallSets) {
        const setCards = scryfallLoader.getSetCards(setCode);
        if (setCards.length === 0) continue;

        // Count how many sample cards exist in this set
        let matchCount = 0;
        for (const sampleName of sampleCards) {
          const found = setCards.find(c =>
            this.normalizeCardName(c.name) === this.normalizeCardName(sampleName)
          );
          if (found) matchCount++;
        }

        const confidence = matchCount / sampleCards.length;

        if (confidence > 0.5 && (!bestMatch || confidence > bestMatch.confidence)) {
          bestMatch = {
            setCode,
            setName: setCards[0].set_name,
            confidence
          };
        }
      }

      if (bestMatch && bestMatch.confidence >= 0.5) {
        const mapping: ExpansionMapping = {
          expansionId,
          setCode: bestMatch.setCode,
          setName: bestMatch.setName,
          confidence: bestMatch.confidence,
          source: 'auto'
        };

        this.mappings.set(expansionId, mapping);
        this.reverseMappings.set(bestMatch.setCode, expansionId);
      }
    }
  }

  /**
   * Normalize card name for comparison
   */
  private normalizeCardName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Normalize set name for comparison
   */
  private normalizeSetName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/magic/g, '')
      .replace(/thegathering/g, '')
      .trim();
  }

  /**
   * Load mappings from file
   */
  private loadMappingsFromFile(): void {
    if (!fs.existsSync(ExpansionMapper.MAPPING_FILE)) {
      return;
    }

    try {
      const data = JSON.parse(fs.readFileSync(ExpansionMapper.MAPPING_FILE, 'utf-8'));

      // Load manual overrides
      if (data.manualOverrides) {
        for (const [idStr, mappingData] of Object.entries(data.manualOverrides)) {
          const mapping = mappingData as any;
          const id = parseInt(idStr);
          this.mappings.set(id, {
            expansionId: id,
            setCode: mapping.code,
            setName: mapping.name,
            confidence: 1.0,
            source: 'manual'
          });
          this.reverseMappings.set(mapping.code.toUpperCase(), id);
        }
      }

      // Load auto-generated (can be overridden)
      if (data.autoGenerated) {
        for (const [idStr, mappingData] of Object.entries(data.autoGenerated)) {
          const mapping = mappingData as any;
          const id = parseInt(idStr);
          if (!this.mappings.has(id)) { // Don't override manual
            this.mappings.set(id, {
              expansionId: id,
              setCode: mapping.code,
              setName: mapping.name,
              confidence: mapping.confidence || 1.0,
              source: 'auto'
            });
            this.reverseMappings.set(mapping.code.toUpperCase(), id);
          }
        }
      }

      console.log(`✓ Loaded ${this.mappings.size} expansion mappings from file`);
    } catch (error) {
      console.warn('⚠ Failed to load expansion mappings:', error);
    }
  }

  /**
   * Save mappings to file
   */
  saveMappings(): void {
    const data: any = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      autoGenerated: {},
      manualOverrides: {},
      unmapped: []
    };

    for (const [id, mapping] of this.mappings) {
      const entry = {
        code: mapping.setCode,
        name: mapping.setName,
        confidence: mapping.confidence
      };

      if (mapping.source === 'manual') {
        data.manualOverrides[id] = entry;
      } else {
        data.autoGenerated[id] = entry;
      }
    }

    fs.writeFileSync(
      ExpansionMapper.MAPPING_FILE,
      JSON.stringify(data, null, 2)
    );
  }

  /**
   * Get all mappings
   */
  getAllMappings(): ExpansionMapping[] {
    return Array.from(this.mappings.values());
  }
}
