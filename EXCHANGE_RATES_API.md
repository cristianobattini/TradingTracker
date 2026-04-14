# Exchange Rate Service Documentation

## Overview

The Exchange Rate Service provides real-time currency exchange rates with intelligent caching and fallback mechanisms. It uses the **European Central Bank (ECB) API** as the primary source for live rates.

## Features

✅ **Live Exchange Rates** - Fetches from ECB API (updated daily)  
✅ **Intelligent Caching** - Caches rates for 1 hour (configurable)  
✅ **Automatic Fallback** - Falls back to static rates if API is unavailable  
✅ **Multi-Currency Support** - 10+ major currencies  
✅ **Easy Integration** - Simple API for getting rates and converting amounts  
✅ **No API Key Required** - ECB API is completely free  

## Architecture

### Components

1. **ExchangeRateService** - Main service class
2. **Caching Layer** - In-memory cache with TTL
3. **ECB API Integration** - Primary data source
4. **Fallback Rates** - Static rates for downtime

### Data Flow

```
Request for rate (EUR/USD)
    ↓
[Check if same currency] → Return 1.0
    ↓
[Check cache] → Found → Return cached rate
    ↓
[Call ECB API] → Parse XML → Cache results → Return rate
    ↓
[On API Error] → Use static fallback rates
```

## API Endpoints

### 1. Get Single Exchange Rate

```
GET /api/exchange-rates?from_currency=EUR&to_currency=USD
```

**Parameters:**
- `from_currency` - Source currency (default: EUR)
- `to_currency` - Target currency (default: USD)

**Response:**
```json
{
  "from": "EUR",
  "to": "USD",
  "rate": 1.10,
  "timestamp": "2026-04-13T10:30:00Z"
}
```

**Examples:**
```bash
# EUR to USD
curl "http://localhost:8000/api/exchange-rates?from_currency=EUR&to_currency=USD"

# GBP to JPY
curl "http://localhost:8000/api/exchange-rates?from_currency=GBP&to_currency=JPY"
```

### 2. Get All Rates

```
GET /api/exchange-rates/all?base_currency=USD
```

**Parameters:**
- `base_currency` - Base currency for rates (default: USD)

**Response:**
```json
{
  "base": "USD",
  "rates": {
    "EUR": 1.10,
    "GBP": 1.27,
    "JPY": 0.0067,
    "CHF": 1.12,
    "CAD": 0.74,
    "AUD": 0.67,
    "NZD": 0.61,
    "CNY": 0.14,
    "INR": 0.012
  },
  "timestamp": "2026-04-13T10:30:00Z"
}
```

## Python API

### Usage Examples

#### Basic Rate Retrieval

```python
from exchange_rate_service import ExchangeRateService, convert_amount

# Get exchange rate
rate = ExchangeRateService.get_rate("EUR", "USD")
print(f"1 EUR = {rate} USD")  # Output: 1 EUR = 1.10 USD

# Convert amount
usd_value = convert_amount(100, "EUR", "USD")
print(f"100 EUR = {usd_value} USD")  # Output: 100 EUR = 110.00 USD
```

#### Get All Rates

```python
rates = ExchangeRateService.get_all_rates_usd()
print(rates)
# Output: {'EUR': 1.10, 'GBP': 1.27, 'JPY': 0.0067, ...}
```

#### Cache Management

```python
# Clear cache (useful for testing)
ExchangeRateService.clear_cache()
```

### Position Calculator Integration

The `PositionCalculator` class now uses live rates:

```python
from position_calculator import PositionCalculator

# Get exchange rate (uses live API)
rate = PositionCalculator.get_exchange_rate("EUR", "USD")

# Convert position values
converted_pnl = PositionCalculator.convert_amount(1000, "EUR", "USD")
```

## Supported Currencies

The service supports the following 10 major currencies:

| Code | Currency | Used in |
|------|----------|---------|
| USD | US Dollar | Primary base |
| EUR | Euro | ECB operations |
| GBP | British Pound | Forex trading |
| JPY | Japanese Yen | Forex trading |
| CHF | Swiss Franc | Safe-haven asset |
| CAD | Canadian Dollar | Commodity-linked |
| AUD | Australian Dollar | Commodity-linked |
| NZD | New Zealand Dollar | Carry trade |
| CNY | Chinese Yuan | Emerging markets |
| INR | Indian Rupee | Emerging markets |

## Caching Strategy

### Cache Duration
- **Default TTL**: 1 hour (3600 seconds)
- **Configurable**: Via `EXCHANGE_RATE_CACHE_TTL` environment variable

### Cache Key
```
Cache key: ecb_rates_2026-04-13  (format: ecb_rates_YYYY-MM-DD)
```

This ensures:
- Fresh rates each day (when new ECB rates are published)
- Reused rates throughout the day (reduce API calls)
- Automatic cache expiration after 24 hours

### Example Timeline

```
09:00 - First request → ECB API called → Cache populated
09:30 - Second request → Cache hit (returns cached rate)
15:00 - Request after API update → Cache updated if new rates available
Next day 09:00 - New cache key created with new date
```

## Data Sources

### Primary: European Central Bank (ECB)

- **URL**: https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml
- **Format**: XML
- **Update Frequency**: Daily (around 16:00 CET)
- **Base Currency**: EUR
- **Cost**: Free
- **Coverage**: 32+ currencies

**XML Example:**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<gesmes:Envelope xmlns:gesmes="http://www.gesmes.org/xml/2002-08-01">
  <Cube>
    <Cube time="2026-04-13">
      <Cube currency="USD" rate="1.1050"/>
      <Cube currency="GBP" rate="0.8550"/>
      ...
    </Cube>
  </Cube>
</gesmes:Envelope>
```

### Fallback: Static Rates

If ECB API is unavailable, the system uses hardcoded fallback rates. These are updated occasionally but should not be relied upon for production.

## Error Handling

### API Failures

The service handles API failures gracefully:

1. **Connection Timeout** (5 seconds) - Falls back to cache/static rates
2. **Invalid XML** - Falls back to cache/static rates
3. **Missing Currency** - Returns 1.0 (assume same currency)
4. **404 Not Found** - Falls back to static rates

### Logging

All errors are logged with appropriate severity:
```
logger.error(f"Failed to fetch ECB rates: {error}")
logger.warning(f"Currency not in fallback rates: {currency}")
logger.info(f"Using cached rate: EUR/USD = 1.10")
```

## Performance

### Request Times

- **Cache Hit**: < 1ms (immediate)
- **API Call**: 500-1500ms (network dependent)
- **Fallback**: < 1ms (immediate)

### Optimization Tips

1. **Reuse instances** - Don't create new service instances
2. **Batch operations** - Use `get_all_rates_usd()` for multiple conversions
3. **Cache strategy** - Rates are cached per day, so pattern requests within the day
4. **Timeout handling** - Set reasonable timeouts for API calls (5 seconds default)

## Configuration

### Environment Variables

```bash
# Exchange Rates API
USE_EXCHANGE_RATE_API=True
EXCHANGE_RATE_CACHE_TTL=3600

# Logging
LOG_LEVEL=INFO
```

### In Code

```python
# To modify cache TTL
import exchange_rate_service
exchange_rate_service._cache_ttl = 7200  # 2 hours

# To clear cache
ExchangeRateService.clear_cache()
```

## Testing

Run the test script to verify the service:

```bash
cd api/
python test_exchange_rates.py
```

**Expected Output:**
```
============================================================
Testing Exchange Rate Service
============================================================

[Test 1] Get single exchange rate
✓ EUR/USD rate: 1.1050

[Test 2] Same currency (should be 1.0)
✓ USD/USD: 1.0

[Test 3] Convert amount
✓ 100 EUR = 110.50 USD

... more tests ...
```

## Troubleshooting

### Issue: API calls are slow

**Solution**: Check network connection. First call will be slow (API call), subsequent calls should be fast (cache).

### Issue: Rates are outdated

**Solution**: Check the timestamp in the response. ECB updates rates daily around 16:00 CET. Cache is refreshed automatically the next day.

### Issue: Getting 1.0 for all rates

**Solution**: API is likely down and system is using fallback rates. Check logs:
```bash
grep "ECB rates" trading_tracker.log
```

### Issue: Memory usage growing

**Solution**: Cache is per-day based, so memory should be stable. If not, clear cache manually:
```python
ExchangeRateService.clear_cache()
```

## Future Enhancements

### Planned Features

1. **Real-time WebSocket** - Stream rates in real-time
2. **Historical Rates** - Get historical exchange rates by date
3. **Rate Alerts** - Notify when rates cross thresholds
4. **Multiple Providers** - Support multiple data sources (Alpha Vantage, IEX Cloud)
5. **Database Persistence** - Store historical rates
6. **Rate Charts** - Visualize rate trends

### Implementation Priority

```
Priority 1: Database persistence (for historical analysis)
Priority 2: Real-time WebSocket (for traders)
Priority 3: Rate alerts (for risk management)
Priority 4: Multiple providers (for redundancy)
Priority 5: Rate charts (for UI)
```

## References

- **ECB Exchange Rates**: https://www.ecb.europa.eu/stats/eurofxref/
- **Supported Currencies**: https://www.ecb.europa.eu/stats/eurofxref/
- **Open Exchange Rates**: https://openexchangerates.org/ (alternative)
- **Alpha Vantage**: https://www.alphavantage.co/ (alternative)

## License

This service uses the ECB API which is public and free to use. No API key is required.

## Support

For issues or questions:
1. Check the logs: `trading_tracker.log`
2. Run tests: `python test_exchange_rates.py`
3. Check ECB API status: https://www.ecb.europa.eu/stats/eurofxref/
