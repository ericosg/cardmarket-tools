import fs from 'fs';
import path from 'path';
import { Config, ConfigError } from './commands/types';

/**
 * Load and validate configuration from file
 */
export class ConfigLoader {
  private static readonly DEFAULT_CONFIG_PATHS = [
    'config.json',
    './config.json',
    path.join(process.cwd(), 'config.json'),
  ];

  /**
   * Load configuration from a file
   * @param configPath Optional path to config file
   * @returns Parsed and validated configuration
   */
  static load(configPath?: string): Config {
    const pathsToTry = configPath
      ? [configPath]
      : ConfigLoader.DEFAULT_CONFIG_PATHS;

    let configData: string | null = null;
    let usedPath: string | null = null;

    // Try to find and read config file
    for (const tryPath of pathsToTry) {
      try {
        const resolvedPath = path.resolve(tryPath);
        if (fs.existsSync(resolvedPath)) {
          configData = fs.readFileSync(resolvedPath, 'utf-8');
          usedPath = resolvedPath;
          break;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    if (!configData || !usedPath) {
      throw new ConfigError(
        'Configuration file not found. Please create a config.json file.\n' +
        'You can use config.example.json as a template:\n' +
        '  cp config.example.json config.json\n' +
        'Then edit config.json with your Cardmarket API credentials.'
      );
    }

    // Parse JSON
    let config: unknown;
    try {
      config = JSON.parse(configData);
    } catch (error) {
      throw new ConfigError(
        `Failed to parse configuration file: ${usedPath}\n` +
        `Error: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }

    // Validate and return
    return ConfigLoader.validate(config);
  }

  /**
   * Validate configuration object
   * @param config Configuration object to validate
   * @returns Validated configuration
   */
  private static validate(config: unknown): Config {
    if (!config || typeof config !== 'object') {
      throw new ConfigError('Configuration must be an object');
    }

    const cfg = config as Record<string, unknown>;

    // Validate credentials (optional - only required for API mode)
    let validatedCredentials: {
      appToken: string;
      appSecret: string;
      accessToken: string;
      accessTokenSecret: string;
    } | undefined;

    if (cfg.credentials && typeof cfg.credentials === 'object') {
      const credentials = cfg.credentials as Record<string, unknown>;
      const requiredCredentials = ['appToken', 'appSecret', 'accessToken', 'accessTokenSecret'];
      const hasAllCredentials = requiredCredentials.every(
        field => credentials[field] && typeof credentials[field] === 'string'
      );

      if (hasAllCredentials) {
        validatedCredentials = {
          appToken: credentials.appToken as string,
          appSecret: credentials.appSecret as string,
          accessToken: credentials.accessToken as string,
          accessTokenSecret: credentials.accessTokenSecret as string,
        };
      }
    }

    // Validate preferences (optional but recommended)
    const preferences = cfg.preferences as Record<string, unknown> || {};

    if (preferences.country && typeof preferences.country !== 'string') {
      throw new ConfigError('preferences.country must be a string');
    }

    if (preferences.currency && typeof preferences.currency !== 'string') {
      throw new ConfigError('preferences.currency must be a string');
    }

    if (preferences.language && typeof preferences.language !== 'string') {
      throw new ConfigError('preferences.language must be a string');
    }

    if (preferences.maxResults && typeof preferences.maxResults !== 'number') {
      throw new ConfigError('preferences.maxResults must be a number');
    }

    if (preferences.defaultSort && typeof preferences.defaultSort !== 'string') {
      throw new ConfigError('preferences.defaultSort must be a string');
    }

    // Validate defaultSort value
    const validSortOptions = ['trend', 'low', 'avg', 'name', 'none'];
    if (preferences.defaultSort && !validSortOptions.includes(preferences.defaultSort as string)) {
      throw new ConfigError(
        `preferences.defaultSort must be one of: ${validSortOptions.join(', ')}`
      );
    }

    if (preferences.hideFoil !== undefined && typeof preferences.hideFoil !== 'boolean') {
      throw new ConfigError('preferences.hideFoil must be a boolean');
    }

    if (preferences.showPerBooster !== undefined && typeof preferences.showPerBooster !== 'boolean') {
      throw new ConfigError('preferences.showPerBooster must be a boolean');
    }

    if (preferences.productFilter && typeof preferences.productFilter !== 'string') {
      throw new ConfigError('preferences.productFilter must be a string');
    }

    // Validate productFilter value
    const validProductFilters = ['singles', 'nonsingles', 'both'];
    if (preferences.productFilter && !validProductFilters.includes(preferences.productFilter as string)) {
      throw new ConfigError(
        `preferences.productFilter must be one of: ${validProductFilters.join(', ')}`
      );
    }

    // Validate cache settings (optional)
    const cache = cfg.cache as Record<string, unknown> || {};

    if (cache.enabled !== undefined && typeof cache.enabled !== 'boolean') {
      throw new ConfigError('cache.enabled must be a boolean');
    }

    if (cache.ttl !== undefined && typeof cache.ttl !== 'number') {
      throw new ConfigError('cache.ttl must be a number');
    }

    // Validate export settings (optional)
    const exportConfig = cfg.export as Record<string, unknown> || {};

    if (exportConfig.enabled !== undefined && typeof exportConfig.enabled !== 'boolean') {
      throw new ConfigError('export.enabled must be a boolean');
    }

    if (exportConfig.autoUpdate !== undefined && typeof exportConfig.autoUpdate !== 'boolean') {
      throw new ConfigError('export.autoUpdate must be a boolean');
    }

    // Validate EV settings (optional)
    const evConfig = cfg.ev as Record<string, unknown> || {};

    if (evConfig.enabled !== undefined && typeof evConfig.enabled !== 'boolean') {
      throw new ConfigError('ev.enabled must be a boolean');
    }

    if (evConfig.autoUpdate !== undefined && typeof evConfig.autoUpdate !== 'boolean') {
      throw new ConfigError('ev.autoUpdate must be a boolean');
    }

    if (evConfig.updateFrequency !== undefined) {
      const validFrequencies = ['daily', 'weekly', 'manual'];
      if (!validFrequencies.includes(evConfig.updateFrequency as string)) {
        throw new ConfigError(
          `ev.updateFrequency must be one of: ${validFrequencies.join(', ')}`
        );
      }
    }

    if (evConfig.bulkCardThreshold !== undefined && typeof evConfig.bulkCardThreshold !== 'number') {
      throw new ConfigError('ev.bulkCardThreshold must be a number');
    }

    if (evConfig.showVariance !== undefined && typeof evConfig.showVariance !== 'boolean') {
      throw new ConfigError('ev.showVariance must be a boolean');
    }

    if (evConfig.confidenceThreshold !== undefined && typeof evConfig.confidenceThreshold !== 'number') {
      throw new ConfigError('ev.confidenceThreshold must be a number');
    }

    // Build validated config with defaults
    const validatedConfig: Config = {
      credentials: validatedCredentials,
      preferences: {
        country: (preferences.country as string) || 'DE',
        currency: (preferences.currency as string) || 'EUR',
        language: (preferences.language as string) || 'en',
        maxResults: (preferences.maxResults as number) || 20,
        defaultSort: (preferences.defaultSort as 'trend' | 'low' | 'avg' | 'name' | 'none') || 'avg',
        hideFoil: preferences.hideFoil !== undefined ? (preferences.hideFoil as boolean) : true,
        showPerBooster: preferences.showPerBooster !== undefined ? (preferences.showPerBooster as boolean) : true,
        productFilter: (preferences.productFilter as 'singles' | 'nonsingles' | 'both') || 'both',
      },
      cache: {
        enabled: cache.enabled !== undefined ? (cache.enabled as boolean) : true,
        ttl: (cache.ttl as number) || 3600,
      },
      export: {
        enabled: exportConfig.enabled !== undefined ? (exportConfig.enabled as boolean) : true,
        autoUpdate: exportConfig.autoUpdate !== undefined ? (exportConfig.autoUpdate as boolean) : true,
      },
      ev: {
        enabled: evConfig.enabled !== undefined ? (evConfig.enabled as boolean) : true,
        autoUpdate: evConfig.autoUpdate !== undefined ? (evConfig.autoUpdate as boolean) : true,
        updateFrequency: (evConfig.updateFrequency as 'daily' | 'weekly' | 'manual') || 'weekly',
        bulkCardThreshold: (evConfig.bulkCardThreshold as number) || 1.0,
        showVariance: evConfig.showVariance !== undefined ? (evConfig.showVariance as boolean) : false,
        confidenceThreshold: (evConfig.confidenceThreshold as number) || 0.7,
      },
    };

    return validatedConfig;
  }

  /**
   * Check if config file exists
   * @param configPath Optional path to config file
   * @returns true if config exists
   */
  static exists(configPath?: string): boolean {
    const pathsToTry = configPath
      ? [configPath]
      : ConfigLoader.DEFAULT_CONFIG_PATHS;

    for (const tryPath of pathsToTry) {
      try {
        const resolvedPath = path.resolve(tryPath);
        if (fs.existsSync(resolvedPath)) {
          return true;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    return false;
  }

  /**
   * Get the default config file path
   * @returns Default config path
   */
  static getDefaultPath(): string {
    return path.join(process.cwd(), 'config.json');
  }
}
