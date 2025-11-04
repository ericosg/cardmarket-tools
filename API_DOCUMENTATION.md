# Cardmarket API Documentation

Comprehensive reference for the Cardmarket RESTful API (Version 2.0) as used in this CLI tool.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
- [Base URLs](#base-urls)
- [Rate Limits](#rate-limits)
- [Response Formats](#response-formats)
- [Key Endpoints](#key-endpoints)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The Cardmarket API 2.0 provides programmatic access to the Cardmarket marketplace for Magic: The Gathering and other trading card games.

**Official Documentation:**
- Main Page: https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page
- Authentication: https://api.cardmarket.com/ws/documentation/API:Auth_Overview

---

## Export Data Files (Alternative to API)

Cardmarket provides daily export files as an alternative to API calls for basic product and price information.

### Export File Endpoints

**Products Catalog (Singles):**
```
https://downloads.s3.cardmarket.com/productCatalog/productList/products_singles_1.json
```
- Size: ~18MB
- Update frequency: Daily
- Contains: All Magic: The Gathering singles (product catalog)

**Products Catalog (Sealed Products):**
```
https://downloads.s3.cardmarket.com/productCatalog/productList/products_nonsingles_1.json
```
- Size: ~23MB
- Update frequency: Daily
- Contains: All Magic: The Gathering sealed products (booster boxes, prerelease packs, bundles, etc.)

**Price Guide:**
```
https://downloads.s3.cardmarket.com/productCatalog/priceGuide/price_guide_1.json
```
- Size: ~23MB
- Update frequency: Daily
- Contains: Price trends, averages, low/high prices for all products (singles and sealed)

### Export Data Structure

**Products File:**
```json
{
  "createdAt": "2025-11-03T00:00:00+0000",
  "products": [
    {
      "idProduct": 12345,
      "name": "Black Lotus",
      "categoryName": "Magic Single",
      "expansionName": "Limited Edition Alpha",
      "number": "0",
      "rarity": "Rare"
    }
  ]
}
```

**Price Guide File:**
```json
{
  "createdAt": "2025-11-03T00:00:00+0000",
  "priceGuides": [
    {
      "idProduct": 12345,
      "idCategory": 1,
      "avg": 16000.00,
      "low": 12000.00,
      "trend": 15500.00,
      "avg1": 15800.00,
      "avg7": 15700.00,
      "avg30": 15600.00,
      "avg-foil": null,
      "low-foil": null,
      "trend-foil": null
    }
  ]
}
```

### Export vs API Comparison

| Feature | Export Data | Live API |
|---------|-------------|----------|
| **Speed** | Very fast (local) | Slower (network) |
| **Rate limits** | None | 30,000/day |
| **Authentication** | Not required | Required (OAuth) |
| **Data freshness** | Daily updates | Real-time |
| **Product info** | ✅ Yes (singles + sealed) | ✅ Yes |
| **Price trends** | ✅ Yes | ✅ Yes |
| **Default sorting** | ✅ By avg price | ❌ No |
| **Per-booster pricing** | ✅ Yes | ❌ No |
| **Seller offers** | ❌ No | ✅ Yes |
| **Condition filtering** | ❌ No | ✅ Yes |
| **Foil/Signed** | ❌ No | ✅ Yes |
| **Shipping costs** | ❌ No | ✅ Yes |
| **File size** | ~64MB (18MB singles + 23MB sealed + 23MB prices) | N/A |

### When to Use Each

**Use Export Data for:**
- Basic card searches and price checks
- Sealed product searches (booster boxes, prerelease packs, bundles)
- Per-booster price comparisons for sealed products
- Price trend analysis
- Offline access
- High-volume searches without rate limits
- Applications that don't need seller-specific data
- When you want results sorted by cheapest options first

**Use Live API for:**
- Real-time seller offers
- Condition/foil/signed filtering
- Shipping cost calculations
- Seller reputation and ratings
- Making purchases (requires authenticated endpoints)

### Per-Booster Pricing (Export Data Only)

The CLI automatically calculates per-booster pricing for sealed products when using export data mode.

**Supported Product Types:**
- **Booster Boxes** (Play, Draft, Set, Collector)
  - Standard: 36 packs (2024 sets)
  - Modern: 30 packs (2025+ sets like Aetherdrift)
  - Set Booster Boxes: 30 packs
  - Collector Booster Boxes: 12 packs
  - Masters/Horizons/Conspiracy: 24 packs

- **Bundles/Fat Packs**
  - Current: 9 packs (Murders at Karlov Manor onwards)
  - Previous: 8 packs (Zendikar Rising - Lost Caverns of Ixalan)
  - Legacy: 10 packs (Kaladesh - Aether Revolt)

- **Prerelease Packs**
  - Standard: 6 packs

**Calculation:**
```
Per-Booster Price = Average Price ÷ Number of Boosters
```

**Example Output:**
```
Edge of Eternities Play Booster Box | €119.90 avg | €3.33 per booster (36 packs)
Edge of Eternities Bundle          | €45.07 avg  | €5.01 per booster (9 packs)
Edge of Eternities Prerelease Pack | €30.57 avg  | €5.09 per booster (6 packs)
```

**Booster Count Database:**
Located at `data/booster-counts.json`, this file contains:
- Default counts by product type
- Set-specific overrides (for sets with non-standard configurations)
- Historical configurations (accounting for changes over MTG's history)

**CLI Display Options:**
- `hideFoil`: Hide foil price column (default: true)
- `showPerBooster`: Show per-booster column (default: true)
- Override with `--show-foil` or `--hide-per-booster` flags

---

## Authentication

Cardmarket API uses **OAuth 1.0a** authentication. All requests must include a signed OAuth Authorization header.

### Required Credentials

You need four credentials to authenticate:

1. **App Token** (Consumer Key) - Identifies your application
2. **App Secret** (Consumer Secret) - Signs your requests
3. **Access Token** - Identifies the user
4. **Access Token Secret** - Signs the user's requests

### Getting Credentials

1. Log in to Cardmarket
2. Navigate to: https://www.cardmarket.com/en/Magic/Account/API
3. Create a "Dedicated App" (recommended) or "Widget"
4. Save all four credentials securely

### OAuth Header Format

Every request must include an `Authorization` header:

```
Authorization: OAuth realm="https://api.cardmarket.com",
  oauth_consumer_key="<app-token>",
  oauth_token="<access-token>",
  oauth_signature_method="HMAC-SHA1",
  oauth_timestamp="<unix-timestamp>",
  oauth_nonce="<random-string>",
  oauth_version="1.0",
  oauth_signature="<calculated-signature>"
```

### Signature Calculation

The OAuth signature is calculated using HMAC-SHA1:

1. **Create the signature base string:**
   ```
   HTTP_METHOD&URL_ENCODED_URL&URL_ENCODED_PARAMETERS
   ```

2. **Create the signing key:**
   ```
   URL_ENCODE(app_secret)&URL_ENCODE(access_token_secret)
   ```

3. **Generate signature:**
   ```
   BASE64(HMAC-SHA1(signing_key, base_string))
   ```

**Important Notes:**
- Include ALL query parameters in the signature
- Parameters must be sorted alphabetically
- Handle 307 redirects by recalculating the signature for the new URL

### Authentication Resources

- [OAuth Header Guide](https://api.cardmarket.com/ws/documentation/API:Auth_OAuthHeader)
- [Signature Generation](https://api.cardmarket.com/ws/documentation/API:Auth_OAuthHeader)

---

## Base URLs

### Production
```
https://api.cardmarket.com/ws/v2.0/
```

### Sandbox (Testing)
```
https://sandbox.mkmapi.eu/ws/v2.0/
```

**Note:** Use sandbox for development and testing to avoid hitting production rate limits.

---

## Rate Limits

### Daily Request Limits

| Account Type | Requests/Day |
|--------------|--------------|
| Standard Account | 30,000 |
| Professional Seller | 100,000 |

### Best Practices for Rate Limits

- Implement caching (this tool does this by default)
- Use batch operations when possible
- Monitor your usage
- Handle 429 (Too Many Requests) responses gracefully

---

## Response Formats

The API supports two response formats:

### JSON (Recommended)
```bash
Accept: application/json
```

### XML (Legacy)
```bash
Accept: application/xml
```

**This tool uses JSON exclusively.**

---

## Key Endpoints

### 1. Find Products

Search for products by name.

**Endpoint:**
```
GET /products/find
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `search` | string | Yes | Card name to search for |
| `idGame` | integer | Yes | Game ID (1 = Magic: The Gathering) |
| `idLanguage` | integer | No | Language ID (1 = English) |
| `start` | integer | No | Pagination offset (default: 0) |
| `maxResults` | integer | No | Max results (default: 20, max: 100) |
| `idExpansion` | integer | No | Filter by expansion |
| `exact` | boolean | No | Exact name match |

**Example Request:**
```
GET /products/find?search=Black+Lotus&idGame=1&idLanguage=1&maxResults=20
```

**Example Response:**
```json
{
  "product": [
    {
      "idProduct": 12345,
      "name": "Black Lotus",
      "categoryName": "Magic Single",
      "expansionName": "Limited Edition Alpha",
      "rarity": "Rare",
      "image": "https://...",
      "website": "https://..."
    }
  ]
}
```

**Official Docs:** https://api.cardmarket.com/ws/documentation/API_2.0:Products

---

### 2. Get Product Details

Get detailed information about a specific product.

**Endpoint:**
```
GET /products/{idProduct}
```

**Example Request:**
```
GET /products/12345
```

**Example Response:**
```json
{
  "product": {
    "idProduct": 12345,
    "name": "Black Lotus",
    "categoryName": "Magic Single",
    "expansionName": "Limited Edition Alpha",
    "number": "0",
    "rarity": "Rare",
    "countReprints": 5,
    "priceGuide": {
      "SELL": 15000.00,
      "LOW": 12000.00,
      "LOWEX": 13000.00,
      "AVG": 16000.00,
      "TREND": 15500.00
    },
    "links": [...]
  }
}
```

---

### 3. Get Product Articles

Get all available offers (articles) for a product from sellers.

**Endpoint:**
```
GET /products/{idProduct}/articles
```

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `start` | integer | No | Pagination offset |
| `maxResults` | integer | No | Max results per page |
| `userType` | string | No | Filter by user type (private, commercial, powerseller) |
| `minCondition` | string | No | Minimum condition (MT, NM, EX, GD, LP, PL, PO) |
| `idLanguage` | integer | No | Language filter |
| `isFoil` | boolean | No | Foil only |
| `isSigned` | boolean | No | Signed only |
| `isAltered` | boolean | No | Altered only |
| `isPlayset` | boolean | No | Playset (4 cards) only |
| `minAvailable` | integer | No | Minimum quantity available |

**Example Request:**
```
GET /products/12345/articles?minCondition=EX&maxResults=50
```

**Example Response:**
```json
{
  "article": [
    {
      "idArticle": 789012,
      "idProduct": 12345,
      "language": {
        "idLanguage": 1,
        "languageName": "English"
      },
      "count": 1,
      "price": 15000.00,
      "condition": "NM",
      "isFoil": false,
      "isSigned": false,
      "isAltered": false,
      "isPlayset": false,
      "seller": {
        "idUser": 54321,
        "username": "CardSeller123",
        "country": "DE",
        "isCommercial": true,
        "reputation": 5,
        "shipsFast": true,
        "sellCount": 15000,
        "onVacation": false
      },
      "comments": "Mint condition, pack fresh"
    }
  ]
}
```

**Official Docs:** https://api.cardmarket.com/ws/documentation/API_2.0:Articles

---

### 4. Get Shipping Methods

Get shipping methods and costs for a specific seller.

**Endpoint:**
```
GET /shippingmethods/{idUser}
```

**Note:** Shipping costs may vary by destination country. This endpoint provides base shipping information.

---

### 5. Get User Information

Get information about a user/seller.

**Endpoint:**
```
GET /users/{idUser}
```

**Example Response:**
```json
{
  "user": {
    "idUser": 54321,
    "username": "CardSeller123",
    "country": "DE",
    "isCommercial": true,
    "reputation": 5,
    "sellCount": 15000,
    "shipsFast": true,
    "onVacation": false,
    "riskGroup": 0
  }
}
```

---

## Game IDs

Common game IDs for the `idGame` parameter:

| Game | ID |
|------|-----|
| Magic: The Gathering | 1 |
| Yu-Gi-Oh! | 3 |
| Pokémon | 4 |
| Force of Will | 6 |
| Cardfight!! Vanguard | 7 |
| Final Fantasy | 10 |
| Dragoborne | 13 |
| Flesh and Blood | 18 |

---

## Language IDs

Common language IDs for the `idLanguage` parameter:

| Language | ID |
|----------|-----|
| English | 1 |
| French | 2 |
| German | 3 |
| Spanish | 4 |
| Italian | 5 |
| Japanese | 8 |
| Portuguese | 9 |
| Russian | 10 |
| Korean | 11 |
| Chinese (Traditional) | 12 |
| Chinese (Simplified) | 13 |

---

## Condition Codes

Card condition codes used in the API:

| Code | Meaning | Description |
|------|---------|-------------|
| MT | Mint | Perfect condition |
| NM | Near Mint | Very minor imperfections |
| EX | Excellent | Minor wear visible |
| GD | Good | Moderate wear |
| LP | Light Played | Noticeable wear |
| PL | Played | Heavy wear |
| PO | Poor | Severe wear, damaged |

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Request succeeded |
| 204 | No Content | Request succeeded, no data |
| 307 | Temporary Redirect | Follow redirect, recalculate signature |
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Check OAuth credentials |
| 403 | Forbidden | Invalid signature or permissions |
| 404 | Not Found | Resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded, wait and retry |
| 500 | Internal Server Error | API issue, retry later |
| 503 | Service Unavailable | API maintenance, retry later |

### Error Response Format

```json
{
  "error": {
    "code": 401,
    "message": "Authentication failed"
  }
}
```

---

## Best Practices

### 1. Caching
- Cache product searches and details
- Respect cache headers
- Use reasonable TTLs (1 hour for prices, 24 hours for static data)

### 2. Pagination
- Use `start` and `maxResults` parameters
- Don't request more than 100 results per page
- Implement proper pagination for large result sets

### 3. Error Handling
- Implement exponential backoff for retries
- Handle 307 redirects properly (recalculate signature)
- Log errors for debugging

### 4. Performance
- Batch operations when possible
- Use conditional requests (If-Modified-Since)
- Minimize redundant API calls

### 5. Security
- Never commit credentials to version control
- Use environment variables or config files
- Rotate credentials periodically
- Use HTTPS only

### 6. Rate Limiting
- Implement client-side rate limiting
- Monitor your daily usage
- Use webhooks instead of polling when available

---

## Important Notes

### 307 Redirect Handling

The `/products/find` endpoint often returns a 307 redirect. You MUST:

1. Follow the redirect to the new URL
2. Recalculate the OAuth signature for the new URL
3. Include all query parameters in the new signature

**Failure to recalculate the signature will result in 403 Forbidden.**

### Timestamp Synchronization

OAuth signatures include timestamps. Ensure your system clock is synchronized (use NTP). A timestamp difference of more than 5 minutes will cause authentication failures.

### Query Parameter Encoding

All query parameters must be:
- URL-encoded
- Included in the OAuth signature base string
- Sorted alphabetically

---

## Additional Resources

### Official Documentation
- [API 2.0 Main Page](https://api.cardmarket.com/ws/documentation/API_2.0:Main_Page)
- [Authentication Overview](https://api.cardmarket.com/ws/documentation/API:Auth_Overview)
- [OAuth Header Format](https://api.cardmarket.com/ws/documentation/API:Auth_OAuthHeader)
- [Products Endpoint](https://api.cardmarket.com/ws/documentation/API_2.0:Products)
- [Articles Endpoint](https://api.cardmarket.com/ws/documentation/API_2.0:Articles)
- [Users Endpoint](https://api.cardmarket.com/ws/documentation/API_2.0:User)

### Community Resources
- [Python MKM API](https://github.com/andli/pymkm)
- [JavaScript MKM API](https://github.com/martsve/mkm_api)
- [Stack Overflow Tag](https://stackoverflow.com/questions/tagged/cardmarket)

### Support
- [Cardmarket API Help Center](https://help.cardmarket.com/en/cardmarket-api)
- Contact: support@cardmarket.com

---

## Changelog

### Version 2.0 (Current)
- JSON response format support
- Improved pagination
- Query parameters in OAuth signature
- Better error messages
- Rate limit headers

### Version 1.1 (Deprecated)
- XML only
- Basic OAuth implementation

### Version 1.0 (Deprecated)
- Initial release
- Limited functionality

---

## License & Terms

Use of the Cardmarket API is subject to:
- [Cardmarket Terms of Service](https://www.cardmarket.com/en/TermsOfService)
- [API Usage Policy](https://www.cardmarket.com/en/Magic/Account/API)

**Important:** Respect rate limits and don't abuse the API. Excessive use may result in account suspension.
