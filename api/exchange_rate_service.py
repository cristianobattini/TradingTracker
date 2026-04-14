"""
Exchange Rate Service
Fetches live currency exchange rates from multiple sources with caching.
"""

import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import Optional, Dict
import logging

logger = logging.getLogger(__name__)

# Fallback rates (if API is down)
FALLBACK_RATES = {
    "USD": 1.0,
    "EUR": 1.10,
    "GBP": 1.27,
    "JPY": 0.0067,
    "CHF": 1.12,
    "CAD": 0.74,
    "AUD": 0.67,
    "NZD": 0.61,
    "CNY": 0.14,
    "INR": 0.012,
}

# Cache with TTL
_rate_cache: Dict[str, Dict] = {}
_cache_ttl = 3600  # 1 hour in seconds


class ExchangeRateService:
    """Service for fetching live exchange rates from multiple sources."""
    
    # ECB publishes rates daily at ~16:00 CET
    ECB_URL = "https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml"
    
    # Open Exchange Rates (free tier: 1000 requests/month, ~30/day)
    # Requires OPENEXCHANGERATES_API_KEY env var
    OER_BASE_URL = "https://openexchangerates.org/api/latest.json"
    
    @staticmethod
    def get_rate(from_currency: str, to_currency: str) -> float:
        """
        Get exchange rate from one currency to another.
        
        Args:
            from_currency: Source currency (e.g., 'EUR')
            to_currency: Target currency (e.g., 'USD')
            
        Returns:
            Exchange rate as float. Returns 1.0 if currencies are the same.
            Falls back to cached/static rates if API fails.
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        if from_currency == to_currency:
            return 1.0
        
        # Try to get from ECB API
        try:
            rate = ExchangeRateService._get_from_ecb(from_currency, to_currency)
            if rate:
                return rate
        except Exception as e:
            logger.warning(f"ECB API failed: {e}. Falling back to cached rates.")
        
        # Try cached rates
        cached_rate = ExchangeRateService._get_from_cache(from_currency, to_currency)
        if cached_rate:
            return cached_rate
        
        # Fall back to static rates
        return ExchangeRateService._get_fallback_rate(from_currency, to_currency)
    
    @staticmethod
    def _get_from_ecb(from_currency: str, to_currency: str) -> Optional[float]:
        """
        Fetch rates from ECB (European Central Bank) API.
        ECB rates are always relative to EUR.
        
        Returns rate to convert from_currency to to_currency.
        """
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        # Check cache first
        cache_key = f"ecb_rates_{datetime.utcnow().strftime('%Y-%m-%d')}"
        if cache_key in _rate_cache:
            rates = _rate_cache[cache_key]["rates"]
            return ExchangeRateService._convert_from_rates(rates, from_currency, to_currency)
        
        try:
            response = requests.get(ExchangeRateService.ECB_URL, timeout=5)
            response.raise_for_status()
            
            # Parse XML
            root = ET.fromstring(response.content)
            
            # ECB XML namespace
            ns = {'ecb': 'http://www.ecb.int/vocabulary/2002-08-01/eurofxref'}
            
            rates = {"EUR": 1.0}  # Base currency
            
            # Extract all currency rates (relative to EUR)
            for cube in root.findall('.//ecb:Cube[@currency]', ns):
                currency = cube.get('currency')
                rate = float(cube.get('rate'))
                rates[currency] = rate
            
            # Cache the rates
            _rate_cache[cache_key] = {
                "rates": rates,
                "expires_at": datetime.utcnow() + timedelta(seconds=_cache_ttl)
            }
            
            logger.info(f"ECB rates fetched successfully. {len(rates)} currencies cached.")
            
            return ExchangeRateService._convert_from_rates(rates, from_currency, to_currency)
        
        except requests.RequestException as e:
            logger.error(f"Failed to fetch ECB rates: {e}")
            return None
        except Exception as e:
            logger.error(f"Error parsing ECB rates: {e}")
            return None
    
    @staticmethod
    def _convert_from_rates(rates: Dict[str, float], from_curr: str, to_curr: str) -> Optional[float]:
        """Convert between two currencies using a rates dict (with EUR as base)."""
        from_curr = from_curr.upper()
        to_curr = to_curr.upper()
        
        if from_curr == to_curr:
            return 1.0
        
        # If one of them is not in rates, return None
        if from_curr not in rates or to_curr not in rates:
            return None
        
        # Convert: (to_curr / from_curr)
        # Since all are relative to EUR: to_curr_in_eur / from_curr_in_eur
        rate = rates[to_curr] / rates[from_curr]
        return rate
    
    @staticmethod
    def _get_from_cache(from_currency: str, to_currency: str) -> Optional[float]:
        """Get rate from in-memory cache if available and not expired."""
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        for cache_key, cache_data in _rate_cache.items():
            if datetime.utcnow() < cache_data.get("expires_at", datetime.utcnow()):
                rates = cache_data.get("rates", {})
                result = ExchangeRateService._convert_from_rates(rates, from_currency, to_currency)
                if result:
                    logger.debug(f"Using cached rate: {from_currency}/{to_currency} = {result}")
                    return result
        
        return None
    
    @staticmethod
    def _get_fallback_rate(from_currency: str, to_currency: str) -> float:
        """Get rate from static fallback rates."""
        from_currency = from_currency.upper()
        to_currency = to_currency.upper()
        
        from_rate = FALLBACK_RATES.get(from_currency)
        to_rate = FALLBACK_RATES.get(to_currency)
        
        if from_rate is None or to_rate is None:
            logger.warning(f"Currency not in fallback rates: {from_currency} or {to_currency}")
            return 1.0
        
        # All rates are relative to USD, so convert properly
        rate = to_rate / from_rate
        logger.info(f"Using fallback rate: {from_currency}/{to_currency} = {rate}")
        return rate
    
    @staticmethod
    def get_all_rates_usd() -> Dict[str, float]:
        """
        Get all supported currency rates relative to USD.
        Useful for frontend or bulk conversions.
        """
        try:
            # Get ECB rates (relative to EUR)
            response = requests.get(ExchangeRateService.ECB_URL, timeout=5)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            ns = {'ecb': 'http://www.ecb.int/vocabulary/2002-08-01/eurofxref'}
            
            rates_to_eur = {"EUR": 1.0}
            
            for cube in root.findall('.//ecb:Cube[@currency]', ns):
                currency = cube.get('currency')
                rate = float(cube.get('rate'))
                rates_to_eur[currency] = rate
            
            # Convert to USD base
            usd_rate = rates_to_eur.get("USD")
            if usd_rate is None:
                return FALLBACK_RATES
            
            rates_to_usd = {}
            for curr, rate_to_eur in rates_to_eur.items():
                rates_to_usd[curr] = rate_to_eur / usd_rate
            
            return rates_to_usd
        
        except Exception as e:
            logger.error(f"Failed to get all rates: {e}")
            return FALLBACK_RATES
    
    @staticmethod
    def clear_cache():
        """Clear the rate cache (useful for testing or manual refresh)."""
        global _rate_cache
        _rate_cache.clear()
        logger.info("Exchange rate cache cleared")


# Convenience functions
def get_exchange_rate(from_currency: str, to_currency: str) -> float:
    """Get exchange rate between two currencies."""
    return ExchangeRateService.get_rate(from_currency, to_currency)


def convert_amount(amount: float, from_currency: str, to_currency: str) -> float:
    """Convert an amount from one currency to another."""
    if amount == 0:
        return 0.0
    
    rate = get_exchange_rate(from_currency, to_currency)
    return amount * rate
