import { EVResult, SetEVResults, TopValueCard, BoosterType } from './types';
import { ScryfallLoader } from './scryfall-loader';
import { ScryfallDownloader } from './scryfall-downloader';
import { ExpansionMapper } from './expansion-mapper';
import { CollationEngine } from './collation-engine';
import { BoosterCountLookup } from '../utils/booster-count';
import { ExportDownloader } from '../export/downloader';

/**
 * Main EV calculator - coordinates all EV calculation logic
 */
export class EVCalculator {
  private scryfallLoader: ScryfallLoader;
  private expansionMapper: ExpansionMapper;
  private collationEngine: CollationEngine;
  private initialized: boolean = false;
  private bulkThreshold: number = 1.0;

  constructor(bulkThreshold: number = 1.0) {
    this.scryfallLoader = new ScryfallLoader();
    this.expansionMapper = new ExpansionMapper();
    this.collationEngine = new CollationEngine();
    this.bulkThreshold = bulkThreshold;
  }

  /**
   * Initialize all components
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    console.log('Initializing EV calculator...');

    // Load Scryfall data
    await this.scryfallLoader.load();

    // Initialize expansion mapper
    await this.expansionMapper.initialize(this.scryfallLoader);

    // Load collation rules
    await this.collationEngine.load();

    this.initialized = true;
    console.log('✓ EV calculator ready');
  }

  /**
   * Calculate EV for a sealed product
   */
  async calculateEV(
    productId: number,
    productName: string,
    categoryName: string,
    expansionId: number,
    sealedPrice: number
  ): Promise<EVResult | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Get set code from expansion mapper
    const setCode = this.expansionMapper.getSetCode(expansionId);
    if (!setCode) {
      return null; // Can't calculate without set mapping
    }

    // Get cards for this set
    const cards = this.scryfallLoader.getSetCards(setCode);
    if (cards.length === 0) {
      return null; // No card data
    }

    // Determine booster type and count
    const boosterCount = BoosterCountLookup.getBoosterCount(productName, categoryName);
    if (!boosterCount) {
      return null; // Not a supported sealed product
    }

    // Determine booster type from product name
    const boosterType = this.determineBoosterType(productName);

    // Calculate box EV
    const boxEV = this.collationEngine.calculateBoxEV(
      setCode,
      boosterType,
      boosterCount,
      cards,
      this.bulkThreshold
    );

    // Calculate pack EV
    const packEV = boxEV.packEV;

    // Calculate ratios
    const evRatio = sealedPrice > 0 ? boxEV.totalEV / sealedPrice : 0;
    const evDifference = boxEV.totalEV - sealedPrice;

    // Get data freshness
    const scryfallStatus = ScryfallDownloader.getDataStatus();
    const exportStatus = ExportDownloader.getDataStatus();

    // Build breakdown
    const packBreakdown = this.collationEngine.calculatePackEV(setCode, boosterType, cards, this.bulkThreshold);

    return {
      productId,
      productName,
      sealedPrice,

      packEV,
      boxEV: boxEV.totalEV,
      evRatio,
      evDifference,

      confidence: packBreakdown.confidence,
      dataSource: 'Scryfall + Cardmarket',
      scryfallDataAge: scryfallStatus.age || 0,
      cardmarketDataAge: Math.max(
        exportStatus.productsSinglesAge || 0,
        exportStatus.productsNonsinglesAge || 0
      ),

      setCode,
      setName: cards[0].set_name,
      expansionId,

      boosterType,
      boosterCount,

      breakdown: {
        mythicContribution: packBreakdown.slotContributions.rareMythicSlot?.breakdown?.mythic || 0,
        rareContribution: packBreakdown.slotContributions.rareMythicSlot?.breakdown?.rare || 0,
        uncommonContribution: packBreakdown.slotContributions.uncommonSlot?.ev || 0,
        commonContribution: packBreakdown.slotContributions.commonSlot?.ev || 0,
        foilContribution: packBreakdown.foilAdjustment
      },

      topCards: boxEV.topCards,

      variance: boxEV.variance
    };
  }

  /**
   * Calculate EV for all products in a set
   */
  async calculateSetEVs(expansionId: number): Promise<SetEVResults | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    const setCode = this.expansionMapper.getSetCode(expansionId);
    if (!setCode) {
      return null;
    }

    const cards = this.scryfallLoader.getSetCards(setCode);
    if (cards.length === 0) {
      return null;
    }

    // Get set statistics
    const stats = this.scryfallLoader.getSetStats(setCode, this.bulkThreshold);

    // Calculate rarity stats
    const mythics = cards.filter(c => c.rarity === 'mythic' && c.eur !== null && c.eur >= this.bulkThreshold);
    const rares = cards.filter(c => c.rarity === 'rare' && c.eur !== null && c.eur >= this.bulkThreshold);
    const uncommons = cards.filter(c => c.rarity === 'uncommon' && c.eur !== null && c.eur >= this.bulkThreshold);
    const commons = cards.filter(c => c.rarity === 'common' && c.eur !== null && c.eur >= this.bulkThreshold);

    const mythicStats = {
      count: mythics.length,
      avgPrice: mythics.length > 0 ? mythics.reduce((sum, c) => sum + c.eur!, 0) / mythics.length : 0,
      totalValue: mythics.reduce((sum, c) => sum + c.eur!, 0)
    };

    const rareStats = {
      count: rares.length,
      avgPrice: rares.length > 0 ? rares.reduce((sum, c) => sum + c.eur!, 0) / rares.length : 0,
      totalValue: rares.reduce((sum, c) => sum + c.eur!, 0)
    };

    const uncommonStats = {
      count: uncommons.length,
      avgPrice: uncommons.length > 0 ? uncommons.reduce((sum, c) => sum + c.eur!, 0) / uncommons.length : 0,
      totalValue: uncommons.reduce((sum, c) => sum + c.eur!, 0)
    };

    const commonStats = {
      count: commons.length,
      avgPrice: commons.length > 0 ? commons.reduce((sum, c) => sum + c.eur!, 0) / commons.length : 0,
      totalValue: commons.reduce((sum, c) => sum + c.eur!, 0)
    };

    // Get top cards
    const allPriceable = cards
      .filter(c => c.eur !== null && c.eur >= this.bulkThreshold)
      .sort((a, b) => b.eur! - a.eur!);

    const totalValue = allPriceable.reduce((sum, c) => sum + c.eur!, 0);

    const topCards: TopValueCard[] = allPriceable.slice(0, 20).map(card => ({
      name: card.name,
      rarity: card.rarity,
      price: card.eur!,
      foilPrice: card.eur_foil || undefined,
      collectorNumber: card.collector_number,
      contribution: totalValue > 0 ? (card.eur! / totalValue) * 100 : 0
    }));

    return {
      setCode,
      setName: cards[0].set_name,
      expansionId,

      products: [], // Will be populated by caller

      totalUniqueCards: stats.totalCards,
      priceableCards: stats.priceableCards,
      totalSetValue: stats.totalValue,
      avgCardPrice: stats.priceableCards > 0 ? stats.totalValue / stats.priceableCards : 0,

      mythics: mythicStats,
      rares: rareStats,
      uncommons: uncommonStats,
      commons: commonStats,

      topCards
    };
  }

  /**
   * Get top value cards from a set
   */
  getTopValueCards(
    expansionId: number,
    limit: number = 20,
    minPrice: number = 1.0
  ): TopValueCard[] | null {
    const setCode = this.expansionMapper.getSetCode(expansionId);
    if (!setCode) {
      return null;
    }

    const cards = this.scryfallLoader.getSetCards(setCode);
    const priceable = cards
      .filter(c => c.eur !== null && c.eur >= minPrice)
      .sort((a, b) => b.eur! - a.eur!);

    const totalValue = priceable.reduce((sum, c) => sum + c.eur!, 0);

    return priceable.slice(0, limit).map(card => ({
      name: card.name,
      rarity: card.rarity,
      price: card.eur!,
      foilPrice: card.eur_foil || undefined,
      collectorNumber: card.collector_number,
      contribution: totalValue > 0 ? (card.eur! / totalValue) * 100 : 0
    }));
  }

  /**
   * Determine booster type from product name/category
   */
  private determineBoosterType(productName: string): BoosterType {
    const name = productName.toLowerCase();

    if (name.includes('collector')) return 'collectorBooster';
    if (name.includes('set booster')) return 'setBooster';
    if (name.includes('draft booster')) return 'draftBooster';
    if (name.includes('play booster')) return 'playBooster';

    // Default based on era (Play Booster is modern default)
    return 'playBooster';
  }
}
