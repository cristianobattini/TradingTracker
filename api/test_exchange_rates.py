"""
Test script for exchange rate service.
Run this to verify the API is working correctly.
"""

import sys
import os

# Add the api folder to path
sys.path.insert(0, os.path.dirname(__file__))

from exchange_rate_service import ExchangeRateService, convert_amount, FALLBACK_RATES

def test_exchange_rates():
    print("=" * 60)
    print("Testing Exchange Rate Service")
    print("=" * 60)
    
    # Test 1: Simple rate conversion
    print("\n[Test 1] Get single exchange rate")
    print("-" * 40)
    try:
        rate = ExchangeRateService.get_rate("EUR", "USD")
        print(f"✓ EUR/USD rate: {rate:.4f}")
    except Exception as e:
        print(f"✗ Failed: {e}")
    
    # Test 2: Same currency
    print("\n[Test 2] Same currency (should be 1.0)")
    print("-" * 40)
    rate = ExchangeRateService.get_rate("USD", "USD")
    assert rate == 1.0, "Same currency should return 1.0"
    print(f"✓ USD/USD: {rate}")
    
    # Test 3: Amount conversion
    print("\n[Test 3] Convert amount")
    print("-" * 40)
    try:
        amount_usd = convert_amount(100, "EUR", "USD")
        print(f"✓ 100 EUR = {amount_usd:.2f} USD")
    except Exception as e:
        print(f"✗ Failed: {e}")
    
    # Test 4: Get all rates
    print("\n[Test 4] Get all rates relative to USD")
    print("-" * 40)
    try:
        all_rates = ExchangeRateService.get_all_rates_usd()
        print(f"✓ Retrieved {len(all_rates)} currency rates")
        for curr in ["EUR", "GBP", "JPY"]:
            if curr in all_rates:
                print(f"  {curr}: {all_rates[curr]:.6f}")
    except Exception as e:
        print(f"✗ Failed: {e}")
    
    # Test 5: Multiple conversions with cache
    print("\n[Test 5] Multiple conversions (testing cache)")
    print("-" * 40)
    try:
        conversions = [
            ("EUR", "USD", 100),
            ("GBP", "EUR", 50),
            ("JPY", "USD", 10000),
        ]
        for from_c, to_c, amount in conversions:
            result = convert_amount(amount, from_c, to_c)
            print(f"✓ {amount} {from_c} = {result:.2f} {to_c}")
    except Exception as e:
        print(f"✗ Failed: {e}")
    
    # Test 6: Fallback rates
    print("\n[Test 6] Fallback rates (static)")
    print("-" * 40)
    print(f"Supported fallback rates: {list(FALLBACK_RATES.keys())}")
    
    # Test 7: Clear cache
    print("\n[Test 7] Clear cache")
    print("-" * 40)
    ExchangeRateService.clear_cache()
    print("✓ Cache cleared")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)


if __name__ == "__main__":
    test_exchange_rates()
