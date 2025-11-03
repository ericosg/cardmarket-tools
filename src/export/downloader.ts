import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { PriceGuideExport, ProductsExport } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const PRODUCTS_SINGLES_FILE = path.join(DATA_DIR, 'products_singles.json');
const PRODUCTS_NONSINGLES_FILE = path.join(DATA_DIR, 'products_nonsingles.json');
const PRICE_GUIDE_FILE = path.join(DATA_DIR, 'price_guide.json');

const PRODUCTS_SINGLES_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_1.json';
const PRODUCTS_NONSINGLES_URL = 'https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_1.json';
const PRICE_GUIDE_URL = 'https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json';

const MAX_AGE_HOURS = 24;

/**
 * Export data downloader
 */
export class ExportDownloader {
  /**
   * Ensure data directory exists
   */
  private static ensureDataDirectory(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Check if a file exists and is recent enough
   * @param filePath Path to file
   * @returns true if file exists and is less than MAX_AGE_HOURS old
   */
  private static isFileRecent(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
      return false;
    }

    const stats = fs.statSync(filePath);
    const ageHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);

    return ageHours < MAX_AGE_HOURS;
  }

  /**
   * Get file age in hours
   * @param filePath Path to file
   * @returns Age in hours, or null if file doesn't exist
   */
  static getFileAge(filePath: string): number | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    return (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
  }

  /**
   * Download a file from URL and save to disk
   * @param url Source URL
   * @param destPath Destination file path
   * @param description Description for logging
   */
  private static async downloadFile(
    url: string,
    destPath: string,
    description: string
  ): Promise<void> {
    try {
      console.log(`Downloading ${description}...`);

      const response = await axios.get(url, {
        responseType: 'stream',
        timeout: 120000, // 2 minutes
      });

      const writer = fs.createWriteStream(destPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      console.log(`✓ Downloaded ${description}`);
    } catch (error) {
      throw new Error(
        `Failed to download ${description}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Download products singles file if needed
   * @param force Force download even if file is recent
   */
  static async downloadProductsSingles(force: boolean = false): Promise<boolean> {
    ExportDownloader.ensureDataDirectory();

    if (!force && ExportDownloader.isFileRecent(PRODUCTS_SINGLES_FILE)) {
      return false; // Already up to date
    }

    await ExportDownloader.downloadFile(
      PRODUCTS_SINGLES_URL,
      PRODUCTS_SINGLES_FILE,
      'singles catalog'
    );

    return true;
  }

  /**
   * Download products non-singles file if needed
   * @param force Force download even if file is recent
   */
  static async downloadProductsNonsingles(force: boolean = false): Promise<boolean> {
    ExportDownloader.ensureDataDirectory();

    if (!force && ExportDownloader.isFileRecent(PRODUCTS_NONSINGLES_FILE)) {
      return false; // Already up to date
    }

    await ExportDownloader.downloadFile(
      PRODUCTS_NONSINGLES_URL,
      PRODUCTS_NONSINGLES_FILE,
      'sealed products catalog'
    );

    return true;
  }

  /**
   * Download price guide file if needed
   * @param force Force download even if file is recent
   */
  static async downloadPriceGuide(force: boolean = false): Promise<boolean> {
    ExportDownloader.ensureDataDirectory();

    if (!force && ExportDownloader.isFileRecent(PRICE_GUIDE_FILE)) {
      return false; // Already up to date
    }

    await ExportDownloader.downloadFile(
      PRICE_GUIDE_URL,
      PRICE_GUIDE_FILE,
      'price guide'
    );

    return true;
  }

  /**
   * Download all export files if needed
   * @param force Force download even if files are recent
   */
  static async downloadAll(force: boolean = false): Promise<{
    productsSinglesDownloaded: boolean;
    productsNonsinglesDownloaded: boolean;
    priceGuideDownloaded: boolean;
  }> {
    const productsSinglesDownloaded = await ExportDownloader.downloadProductsSingles(force);
    const productsNonsinglesDownloaded = await ExportDownloader.downloadProductsNonsingles(force);
    const priceGuideDownloaded = await ExportDownloader.downloadPriceGuide(force);

    return {
      productsSinglesDownloaded,
      productsNonsinglesDownloaded,
      priceGuideDownloaded,
    };
  }

  /**
   * Load products singles from disk
   * @returns Parsed products data
   */
  static loadProductsSingles(): ProductsExport | null {
    if (!fs.existsSync(PRODUCTS_SINGLES_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(PRODUCTS_SINGLES_FILE, 'utf-8');
      return JSON.parse(data) as ProductsExport;
    } catch (error) {
      console.error('Failed to load singles file:', error);
      return null;
    }
  }

  /**
   * Load products non-singles from disk
   * @returns Parsed products data
   */
  static loadProductsNonsingles(): ProductsExport | null {
    if (!fs.existsSync(PRODUCTS_NONSINGLES_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(PRODUCTS_NONSINGLES_FILE, 'utf-8');
      return JSON.parse(data) as ProductsExport;
    } catch (error) {
      console.error('Failed to load sealed products file:', error);
      return null;
    }
  }

  /**
   * Load price guide from disk
   * @returns Parsed price guide data
   */
  static loadPriceGuide(): PriceGuideExport | null {
    if (!fs.existsSync(PRICE_GUIDE_FILE)) {
      return null;
    }

    try {
      const data = fs.readFileSync(PRICE_GUIDE_FILE, 'utf-8');
      return JSON.parse(data) as PriceGuideExport;
    } catch (error) {
      console.error('Failed to load price guide file:', error);
      return null;
    }
  }

  /**
   * Check if export data needs update
   * @returns true if data is missing or old
   */
  static needsUpdate(): boolean {
    return (
      !ExportDownloader.isFileRecent(PRODUCTS_SINGLES_FILE) ||
      !ExportDownloader.isFileRecent(PRODUCTS_NONSINGLES_FILE) ||
      !ExportDownloader.isFileRecent(PRICE_GUIDE_FILE)
    );
  }

  /**
   * Get data status
   */
  static getDataStatus(): {
    productsSinglesExists: boolean;
    productsNonsinglesExists: boolean;
    priceGuideExists: boolean;
    productsSinglesAge: number | null;
    productsNonsinglesAge: number | null;
    priceGuideAge: number | null;
    needsUpdate: boolean;
  } {
    return {
      productsSinglesExists: fs.existsSync(PRODUCTS_SINGLES_FILE),
      productsNonsinglesExists: fs.existsSync(PRODUCTS_NONSINGLES_FILE),
      priceGuideExists: fs.existsSync(PRICE_GUIDE_FILE),
      productsSinglesAge: ExportDownloader.getFileAge(PRODUCTS_SINGLES_FILE),
      productsNonsinglesAge: ExportDownloader.getFileAge(PRODUCTS_NONSINGLES_FILE),
      priceGuideAge: ExportDownloader.getFileAge(PRICE_GUIDE_FILE),
      needsUpdate: ExportDownloader.needsUpdate(),
    };
  }
}
