import * as fs from 'fs';
import * as path from 'path';
import { BoosterConfig, BoosterType, PackEVBreakdown, BoxEVBreakdown, ProcessedCard, TopValueCard } from './types';

/**
 * Booster collation engine for calculating EV based on pack composition
 */
export class CollationEngine {
  private defaultRules: Map<BoosterType, any> = new Map();
  private setSpecificRules: Map<string, any> = new Map();
  private static readonly COLLATION_FILE = path.join(process.cwd(), 'data', 'booster_collation.json');

  /**
   * Load booster collation rules
   */
  async load(): Promise<void> {
    if (!fs.existsSync(CollationEngine.COLLATION_FILE)) {
      throw new Error('Booster collation rules not found');
    }

    const data = JSON.parse(fs.readFileSync(CollationEngine.COLLATION_FILE, 'utf-8'));

    // Load default rules
    for (const [type, rules] of Object.entries(data.defaultRules)) {
      this.defaultRules.set(type as BoosterType, rules);
    }

    // Load set-specific rules
    for (const [setCode, rules] of Object.entries(data.setSpecificRules)) {
      this.setSpecificRules.set(setCode.toUpperCase(), rules);
    }

    console.log(`✓ Loaded collation rules for ${this.setSpecificRules.size} sets`);
  }

  /**
   * Get booster configuration for a set
   */
  getBoosterConfig(setCode: string, boosterType: BoosterType): BoosterConfig {
    const code = setCode.toUpperCase();

    // Check for set-specific rules
    const setRules = this.setSpecificRules.get(code);
    if (setRules && setRules.customSlots) {
      return {
        type: boosterType,
        name: setRules.name || boosterType,
        slots: setRules.customSlots,
        wildcard: setRules.wildcard
      };
    }

    // Use set's booster type or provided type
    const typeToUse = setRules?.boosterType || boosterType;
    const defaultRule = this.defaultRules.get(typeToUse);

    if (!defaultRule) {
      // Fallback to playBooster
      const fallback = this.defaultRules.get('playBooster')!;
      return {
        type: 'playBooster',
        name: fallback.name,
        slots: fallback.slots,
        wildcard: fallback.wildcard
      };
    }

    return {
      type: typeToUse,
      name: defaultRule.name,
      slots: defaultRule.slots,
      wildcard: defaultRule.wildcard
    };
  }

  /**
   * Calculate expected value per pack
   */
  calculatePackEV(
    setCode: string,
    boosterType: BoosterType,
    cards: ProcessedCard[],
    bulkThreshold: number = 1.0
  ): PackEVBreakdown {
    const config = this.getBoosterConfig(setCode, boosterType);

    let totalEV = 0;
    const slotContributions: any = {};

    // Calculate EV for each slot
    for (const slot of config.slots) {
      if (slot.type === 'rare_mythic') {
        const mythics = cards.filter(c => c.rarity === 'mythic' && c.eur !== null && c.eur >= bulkThreshold);
        const rares = cards.filter(c => c.rarity === 'rare' && c.eur !== null && c.eur >= bulkThreshold);

        const mythicAvg = this.average(mythics.map(c => c.eur!));
        const rareAvg = this.average(rares.map(c => c.eur!));

        const dist = slot.distribution || { rare: 7, mythic: 1 };
        const totalWeight = dist.rare + dist.mythic;
        const mythicWeight = dist.mythic / totalWeight;
        const rareWeight = dist.rare / totalWeight;

        const slotEV = (mythicAvg * mythicWeight + rareAvg * rareWeight) * slot.count;

        slotContributions.rareMythicSlot = {
          ev: slotEV,
          breakdown: {
            mythic: mythicAvg * mythicWeight * slot.count,
            rare: rareAvg * rareWeight * slot.count
          }
        };

        totalEV += slotEV;

      } else if (slot.type === 'uncommon') {
        const uncommons = cards.filter(c => c.rarity === 'uncommon' && c.eur !== null && c.eur >= bulkThreshold);
        const avgPrice = this.average(uncommons.map(c => c.eur!));
        const slotEV = avgPrice * slot.count;

        slotContributions.uncommonSlot = {
          ev: slotEV,
          avgPrice
        };

        totalEV += slotEV;

      } else if (slot.type === 'common') {
        const commons = cards.filter(c => c.rarity === 'common' && c.eur !== null && c.eur >= bulkThreshold);
        const avgPrice = this.average(commons.map(c => c.eur!));
        const slotEV = avgPrice * slot.count;

        slotContributions.commonSlot = {
          ev: slotEV,
          avgPrice
        };

        totalEV += slotEV;
      }
    }

    // Calculate foil adjustment (simplified - adds average foil premium)
    let foilAdjustment = 0;
    if (config.wildcard?.foil) {
      const foilCards = cards.filter(c => c.eur_foil !== null && c.eur !== null && c.eur_foil > c.eur);
      if (foilCards.length > 0) {
        const avgFoilPremium = this.average(foilCards.map(c => (c.eur_foil! - c.eur!)));
        foilAdjustment = avgFoilPremium * config.wildcard.foil;
      }
    }

    totalEV += foilAdjustment;

    // Calculate confidence based on data availability
    const totalCards = cards.length;
    const priceableCards = cards.filter(c => c.eur !== null && c.eur >= bulkThreshold).length;
    const confidence = totalCards > 0 ? priceableCards / totalCards : 0;

    return {
      totalEV,
      slotContributions,
      foilAdjustment,
      confidence
    };
  }

  /**
   * Calculate expected value per box
   */
  calculateBoxEV(
    setCode: string,
    boosterType: BoosterType,
    packCount: number,
    cards: ProcessedCard[],
    bulkThreshold: number = 1.0
  ): BoxEVBreakdown {
    const packEV = this.calculatePackEV(setCode, boosterType, cards, bulkThreshold);
    const totalEV = packEV.totalEV * packCount;

    // Get top value cards
    const topCards = this.getTopValueCards(cards, bulkThreshold, 20);

    // Calculate expected mythics and rares
    const config = this.getBoosterConfig(setCode, boosterType);
    let mythicRate = 0;
    let rareRate = 0;

    for (const slot of config.slots) {
      if (slot.type === 'rare_mythic' && slot.distribution) {
        const totalWeight = slot.distribution.rare + slot.distribution.mythic;
        mythicRate += (slot.distribution.mythic / totalWeight) * slot.count;
        rareRate += (slot.distribution.rare / totalWeight) * slot.count;
      }
    }

    const expectedMythics = mythicRate * packCount;
    const expectedRares = rareRate * packCount;

    // Calculate expected uncommons and commons
    let uncommonRate = 0;
    let commonRate = 0;

    for (const slot of config.slots) {
      if (slot.type === 'uncommon') uncommonRate += slot.count;
      if (slot.type === 'common') commonRate += slot.count;
    }

    const expectedUncommons = uncommonRate * packCount;

    // Simple variance calculation (simplified)
    const variance = {
      min: totalEV * 0.7,  // Worst case: 70% of EV
      median: totalEV,     // Median is approximately EV
      max: totalEV * 1.5   // Best case: 150% of EV
    };

    return {
      totalEV,
      packEV: packEV.totalEV,
      packCount,
      expectedMythics,
      expectedRares,
      expectedUncommons,
      topCards,
      variance
    };
  }

  /**
   * Get top value cards from a set
   */
  private getTopValueCards(cards: ProcessedCard[], bulkThreshold: number, limit: number): TopValueCard[] {
    const priceableCards = cards
      .filter(c => c.eur !== null && c.eur >= bulkThreshold)
      .sort((a, b) => b.eur! - a.eur!);

    const totalValue = priceableCards.reduce((sum, c) => sum + c.eur!, 0);

    return priceableCards.slice(0, limit).map(card => ({
      name: card.name,
      rarity: card.rarity,
      price: card.eur!,
      foilPrice: card.eur_foil || undefined,
      collectorNumber: card.collector_number,
      contribution: totalValue > 0 ? (card.eur! / totalValue) * 100 : 0
    }));
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }
}
