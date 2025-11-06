import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { ProcessedCard, ScryfallDataStatus, Rarity } from './types';

/**
 * Scryfall bulk data downloader
 */
export class ScryfallDownloader {
  private static readonly DATA_DIR = path.join(process.cwd(), 'data');
  private static readonly PROCESSED_FILE = path.join(ScryfallDownloader.DATA_DIR, 'scryfall_cards.json');
  private static readonly METADATA_FILE = path.join(ScryfallDownloader.DATA_DIR, 'scryfall_metadata.json');
  private static readonly BULK_DATA_API = 'https://api.scryfall.com/bulk-data';

  /**
   * Download bulk data if needed (weekly check)
   */
  static async downloadBulkData(force: boolean = false): Promise<void> {
    if (!force && !this.needsUpdate()) {
      console.log('Scryfall data is up to date (less than 7 days old)');
      return;
    }

    console.log('Downloading Scryfall bulk data...');

    try {
      // Get bulk data URL
      const bulkDataUrl = await this.getBulkDataUrl();

      // Download the file
      console.log('Fetching card data from Scryfall...');
      const response = await axios.get(bulkDataUrl, {
        responseType: 'json',
        timeout: 300000, // 5 minutes
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            process.stdout.write(`\rDownload progress: ${percent}%`);
          }
        }
      });

      console.log('\nProcessing card data...');

      // Process and filter the data
      const rawCards = response.data;
      const processedCards = this.processCards(rawCards);

      // Save processed data
      fs.writeFileSync(
        this.PROCESSED_FILE,
        JSON.stringify(processedCards, null, 2)
      );

      // Save metadata
      const metadata = {
        lastUpdated: new Date().toISOString(),
        cardCount: processedCards.length,
        fileSize: fs.statSync(this.PROCESSED_FILE).size
      };

      fs.writeFileSync(
        this.METADATA_FILE,
        JSON.stringify(metadata, null, 2)
      );

      console.log(`✓ Downloaded and processed ${processedCards.length} cards`);
      console.log(`✓ File size: ${(metadata.fileSize / 1024 / 1024).toFixed(2)} MB`);

    } catch (error: any) {
      throw new Error(`Failed to download Scryfall data: ${error.message}`);
    }
  }

  /**
   * Get bulk data file URL from Scryfall API
   */
  private static async getBulkDataUrl(): Promise<string> {
    try {
      const response = await axios.get(this.BULK_DATA_API, {
        timeout: 30000
      });

      // Find the "Default Cards" bulk data entry
      const bulkDataList = response.data.data;
      const defaultCards = bulkDataList.find((entry: any) =>
        entry.type === 'default_cards'
      );

      if (!defaultCards) {
        throw new Error('Default Cards bulk data not found in Scryfall API');
      }

      return defaultCards.download_uri;
    } catch (error: any) {
      throw new Error(`Failed to get Scryfall bulk data URL: ${error.message}`);
    }
  }

  /**
   * Process raw Scryfall cards into optimized format
   */
  private static processCards(rawCards: any[]): ProcessedCard[] {
    const processed: ProcessedCard[] = [];

    for (const card of rawCards) {
      // Skip non-paper cards
      if (!card.games?.includes('paper')) {
        continue;
      }

      // Skip tokens and other non-collectible cards
      if (card.set_type === 'token' || card.layout === 'token') {
        continue;
      }

      // Normalize rarity
      let rarity: Rarity = card.rarity;
      if (!['common', 'uncommon', 'rare', 'mythic', 'special', 'bonus'].includes(rarity)) {
        rarity = 'common'; // Default fallback
      }

      // Extract EUR prices
      const eur = card.prices?.eur ? parseFloat(card.prices.eur) : null;
      const eur_foil = card.prices?.eur_foil ? parseFloat(card.prices.eur_foil) : null;

      processed.push({
        id: card.id,
        name: card.name,
        set: card.set.toUpperCase(),
        set_name: card.set_name,
        rarity: rarity,
        eur: eur,
        eur_foil: eur_foil,
        collector_number: card.collector_number,
        released_at: card.released_at
      });
    }

    return processed;
  }

  /**
   * Check if data needs update (>7 days old)
   */
  static needsUpdate(): boolean {
    if (!fs.existsSync(this.METADATA_FILE)) {
      return true;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(this.METADATA_FILE, 'utf-8'));
      const lastUpdated = new Date(metadata.lastUpdated);
      const age = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60); // hours

      return age > (7 * 24); // 7 days
    } catch (error) {
      return true;
    }
  }

  /**
   * Get download status and file info
   */
  static getDataStatus(): ScryfallDataStatus {
    if (!fs.existsSync(this.PROCESSED_FILE) || !fs.existsSync(this.METADATA_FILE)) {
      return {
        downloaded: false,
        fileSize: 0,
        needsUpdate: true,
        cardCount: 0
      };
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(this.METADATA_FILE, 'utf-8'));
      const lastUpdated = new Date(metadata.lastUpdated);
      const age = (Date.now() - lastUpdated.getTime()) / (1000 * 60 * 60); // hours

      return {
        downloaded: true,
        fileSize: metadata.fileSize,
        lastUpdated: lastUpdated,
        age: age,
        needsUpdate: age > (7 * 24),
        cardCount: metadata.cardCount
      };
    } catch (error) {
      return {
        downloaded: false,
        fileSize: 0,
        needsUpdate: true,
        cardCount: 0
      };
    }
  }

  /**
   * Load processed cards from disk
   */
  static loadProcessedCards(): ProcessedCard[] | null {
    if (!fs.existsSync(this.PROCESSED_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(this.PROCESSED_FILE, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load processed Scryfall cards:', error);
      return null;
    }
  }
}
