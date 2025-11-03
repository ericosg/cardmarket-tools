import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { CardmarketAuth } from './auth';
import { Cache } from '../utils/cache';
import { Credentials, CardmarketAPIError } from '../commands/types';

export class CardmarketClient {
  private baseURL: string;
  private auth: CardmarketAuth;
  private axios: AxiosInstance;
  private cache: Cache;
  private cacheEnabled: boolean;

  constructor(
    credentials: Credentials,
    cacheEnabled: boolean = true,
    cacheTTL: number = 3600,
    useSandbox: boolean = false
  ) {
    // Validate credentials
    CardmarketAuth.validateCredentials(credentials);

    this.baseURL = useSandbox
      ? 'https://sandbox.mkmapi.eu/ws/v2.0'
      : 'https://api.cardmarket.com/ws/v2.0';

    this.auth = new CardmarketAuth(credentials);
    this.cacheEnabled = cacheEnabled;
    this.cache = new Cache(cacheTTL);

    this.axios = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      maxRedirects: 0, // Handle redirects manually to recalculate OAuth signature
      validateStatus: (status) => {
        // Accept 2xx and 307 (redirect)
        return (status >= 200 && status < 300) || status === 307;
      },
    });
  }

  /**
   * Make a GET request to the Cardmarket API
   * @param endpoint API endpoint (without base URL)
   * @param params Query parameters
   * @param useCache Whether to use cache for this request
   * @returns API response data
   */
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>,
    useCache: boolean = true
  ): Promise<T> {
    // Build full URL with query parameters
    const url = this.buildURL(endpoint, params);
    const cacheKey = Cache.generateKey(url);

    // Check cache
    if (this.cacheEnabled && useCache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached !== undefined) {
        return cached;
      }
    }

    try {
      // Make initial request
      const response = await this.makeRequest('GET', url);

      // Handle 307 redirect
      if (response.status === 307) {
        const redirectURL = response.headers.location;
        if (!redirectURL) {
          throw new CardmarketAPIError('Received 307 redirect without Location header');
        }

        // Make request to redirect URL with recalculated signature
        const redirectResponse = await this.makeRequest('GET', redirectURL);
        const data = redirectResponse.data as T;

        // Cache the result
        if (this.cacheEnabled && useCache) {
          this.cache.set(cacheKey, data);
        }

        return data;
      }

      const data = response.data as T;

      // Cache the result
      if (this.cacheEnabled && useCache) {
        this.cache.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      this.handleError(error);
      throw error; // TypeScript requires this
    }
  }

  /**
   * Make an HTTP request with OAuth authorization
   * @param method HTTP method
   * @param url Full URL
   * @param data Request body (optional)
   * @returns Axios response
   */
  private async makeRequest(
    method: string,
    url: string,
    data?: unknown
  ): Promise<AxiosResponse> {
    const authHeader = this.auth.getAuthorizationHeader(method, url);

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: {
        'Authorization': authHeader,
      },
      data,
    };

    return await this.axios.request(config);
  }

  /**
   * Build full URL with query parameters
   * @param endpoint API endpoint
   * @param params Query parameters
   * @returns Full URL
   */
  private buildURL(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): string {
    // Remove leading slash from endpoint if present
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    let url = `${this.baseURL}/${cleanEndpoint}`;

    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');

      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * Handle API errors
   * @param error Error object
   * @throws CardmarketAPIError
   */
  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error?.message || error.message;

      switch (status) {
        case 401:
          throw new CardmarketAPIError(
            'Authentication failed. Please check your API credentials.',
            401,
            error.response?.data
          );
        case 403:
          throw new CardmarketAPIError(
            'Access forbidden. This may be due to an invalid OAuth signature or insufficient permissions.',
            403,
            error.response?.data
          );
        case 404:
          throw new CardmarketAPIError(
            'Resource not found.',
            404,
            error.response?.data
          );
        case 429:
          throw new CardmarketAPIError(
            'Rate limit exceeded. Please try again later.',
            429,
            error.response?.data
          );
        case 500:
        case 503:
          throw new CardmarketAPIError(
            'Cardmarket API is currently unavailable. Please try again later.',
            status,
            error.response?.data
          );
        default:
          throw new CardmarketAPIError(
            `API request failed: ${message}`,
            status,
            error.response?.data
          );
      }
    }

    // Non-Axios error
    if (error instanceof Error) {
      throw new CardmarketAPIError(error.message);
    }

    throw new CardmarketAPIError('An unknown error occurred');
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache(): number {
    return this.cache.cleanup();
  }
}
