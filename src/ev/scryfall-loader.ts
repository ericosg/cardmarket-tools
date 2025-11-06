import { ProcessedCard, SetStatistics, Rarity } from './types';
import { ScryfallDownloader } from './scryfall-downloader';

/**
 * Scryfall data loader with indexing for fast lookups
 */
export class ScryfallLoader {
  private cards: Map<string, ProcessedCard> = new Map();           // id → card
  private cardsBySet: Map<string, ProcessedCard[]> = new Map();    // setCode → [cards]
  private cardsByRarity: Map<string, Map<Rarity, ProcessedCard[]>> = new Map(); // setCode → rarity → [cards]
  private loaded: boolean = false;

  /**
   * Load and index Scryfall data
   */
  async load(): Promise<void> {
    if (this.loaded) {
      return; // Already loaded
    }

    console.log('Loading Scryfall card data...');

    const cards = ScryfallDownloader.loadProcessedCards();
    if (!cards) {
      throw new Error(
        'Scryfall data not found. Run "pnpm start update-data --scryfall-only" to download.'
      );
    }

    // Build indices
    for (const card of cards) {
      // Index by ID
      this.cards.set(card.id, card);

      // Index by set
      if (!this.cardsBySet.has(card.set)) {
        this.cardsBySet.set(card.set, []);
      }
      this.cardsBySet.get(card.set)!.push(card);

      // Index by set and rarity
      if (!this.cardsByRarity.has(card.set)) {
        this.cardsByRarity.set(card.set, new Map());
      }
      const rarityMap = this.cardsByRarity.get(card.set)!;
      if (!rarityMap.has(card.rarity)) {
        rarityMap.set(card.rarity, []);
      }
      rarityMap.get(card.rarity)!.push(card);
    }

    this.loaded = true;
    console.log(`✓ Loaded ${cards.length} cards from ${this.cardsBySet.size} sets`);
  }

  /**
   * Get all cards from a set
   */
  getSetCards(setCode: string): ProcessedCard[] {
    const code = setCode.toUpperCase();
    return this.cardsBySet.get(code) || [];
  }

  /**
   * Get cards by set and rarity
   */
  getCardsByRarity(setCode: string, rarity: Rarity): ProcessedCard[] {
    const code = setCode.toUpperCase();
    const rarityMap = this.cardsByRarity.get(code);
    if (!rarityMap) {
      return [];
    }
    return rarityMap.get(rarity) || [];
  }

  /**
   * Get single card by name and set
   */
  getCard(name: string, setCode: string): ProcessedCard | null {
    const code = setCode.toUpperCase();
    const cards = this.getSetCards(code);
    return cards.find(c => c.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Get set statistics
   */
  getSetStats(setCode: string, bulkThreshold: number = 1.0): SetStatistics {
    const code = setCode.toUpperCase();
    const cards = this.getSetCards(code);

    if (cards.length === 0) {
      return {
        totalCards: 0,
        priceableCards: 0,
        rarityBreakdown: {} as Record<Rarity, number>,
        avgPriceByRarity: {} as Record<Rarity, number>,
        totalValue: 0
      };
    }

    // Count cards by rarity
    const rarityBreakdown: Record<string, number> = {};
    const rarityPrices: Record<string, number[]> = {};

    let priceableCards = 0;
    let totalValue = 0;

    for (const card of cards) {
      // Count by rarity
      if (!rarityBreakdown[card.rarity]) {
        rarityBreakdown[card.rarity] = 0;
        rarityPrices[card.rarity] = [];
      }
      rarityBreakdown[card.rarity]++;

      // Track prices
      if (card.eur !== null && card.eur >= bulkThreshold) {
        priceableCards++;
        totalValue += card.eur;
        rarityPrices[card.rarity].push(card.eur);
      }
    }

    // Calculate averages by rarity
    const avgPriceByRarity: Record<string, number> = {};
    for (const rarity in rarityPrices) {
      const prices = rarityPrices[rarity];
      if (prices.length > 0) {
        avgPriceByRarity[rarity] = prices.reduce((a, b) => a + b, 0) / prices.length;
      } else {
        avgPriceByRarity[rarity] = 0;
      }
    }

    return {
      totalCards: cards.length,
      priceableCards,
      rarityBreakdown: rarityBreakdown as Record<Rarity, number>,
      avgPriceByRarity: avgPriceByRarity as Record<Rarity, number>,
      totalValue
    };
  }

  /**
   * Get all set codes
   */
  getAllSetCodes(): string[] {
    return Array.from(this.cardsBySet.keys());
  }

  /**
   * Check if data is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get total number of loaded cards
   */
  getCardCount(): number {
    return this.cards.size;
  }

  /**
   * Get total number of sets
   */
  getSetCount(): number {
    return this.cardsBySet.size;
  }
}
