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

    // Build validated config with defaults
    const validatedConfig: Config = {
      credentials: validatedCredentials,
      preferences: {
        country: (preferences.country as string) || 'DE',
        currency: (preferences.currency as string) || 'EUR',
        language: (preferences.language as string) || 'en',
        maxResults: (preferences.maxResults as number) || 20,
      },
      cache: {
        enabled: cache.enabled !== undefined ? (cache.enabled as boolean) : true,
        ttl: (cache.ttl as number) || 3600,
      },
      export: {
        enabled: exportConfig.enabled !== undefined ? (exportConfig.enabled as boolean) : true,
        autoUpdate: exportConfig.autoUpdate !== undefined ? (exportConfig.autoUpdate as boolean) : true,
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
