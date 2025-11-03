import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { Credentials } from '../commands/types';

export class CardmarketAuth {
  private oauth: OAuth;
  private credentials: Credentials;

  constructor(credentials: Credentials) {
    this.credentials = credentials;

    this.oauth = new OAuth({
      consumer: {
        key: credentials.appToken,
        secret: credentials.appSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(baseString, key) {
        return crypto
          .createHmac('sha1', key)
          .update(baseString)
          .digest('base64');
      },
    });
  }

  /**
   * Generate OAuth authorization header for a request
   * @param method HTTP method (GET, POST, etc.)
   * @param url Full URL including query parameters
   * @returns Authorization header value
   */
  getAuthorizationHeader(method: string, url: string): string {
    const token = {
      key: this.credentials.accessToken,
      secret: this.credentials.accessTokenSecret,
    };

    const requestData = {
      url,
      method: method.toUpperCase(),
    };

    const authHeader = this.oauth.toHeader(
      this.oauth.authorize(requestData, token)
    );

    // Add realm to the authorization header
    const authValue = authHeader.Authorization;
    const realm = 'realm="https://api.cardmarket.com"';

    // Insert realm at the beginning of OAuth parameters
    const oauthStart = authValue.indexOf('OAuth ');
    if (oauthStart !== -1) {
      return authValue.substring(0, oauthStart + 6) + realm + ', ' +
             authValue.substring(oauthStart + 6);
    }

    return authValue;
  }

  /**
   * Validate credentials format
   * @param credentials Credentials to validate
   * @throws Error if credentials are invalid
   */
  static validateCredentials(credentials: Credentials): void {
    const required = ['appToken', 'appSecret', 'accessToken', 'accessTokenSecret'];

    for (const field of required) {
      if (!credentials[field as keyof Credentials] ||
          credentials[field as keyof Credentials].trim() === '') {
        throw new Error(`Missing or empty credential: ${field}`);
      }
    }

    // Check if credentials look like placeholders
    const placeholderPatterns = [
      'your-',
      'replace-',
      'insert-',
      'enter-',
      'xxx',
      '123',
    ];

    for (const field of required) {
      const value = credentials[field as keyof Credentials].toLowerCase();
      for (const pattern of placeholderPatterns) {
        if (value.includes(pattern)) {
          throw new Error(
            `Credential '${field}' appears to be a placeholder. ` +
            'Please replace it with your actual Cardmarket API credentials.'
          );
        }
      }
    }
  }
}
