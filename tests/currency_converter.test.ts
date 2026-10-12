import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { currencyRateService } from '../src/services/currencyRateService';
import {
  WORLD_CURRENCIES,
  findCurrencyByCode,
  searchCurrencies,
} from '../src/utils/worldCurrencies';

describe('Global Currency Converter Service', () => {
  test('contains comprehensive world currencies representing all countries', () => {
    assert.ok(WORLD_CURRENCIES.length >= 80, `Expected at least 80 currencies, found ${WORLD_CURRENCIES.length}`);

    // Verify key test currencies exist
    const ngn = findCurrencyByCode('NGN');
    assert.ok(ngn, 'NGN must exist');
    assert.equal(ngn?.country, 'Nigeria');
    assert.equal(ngn?.symbol, '₦');

    const usd = findCurrencyByCode('USD');
    assert.ok(usd, 'USD must exist');

    const eur = findCurrencyByCode('EUR');
    assert.ok(eur, 'EUR must exist');

    const kes = findCurrencyByCode('KES');
    assert.ok(kes, 'KES (Kenyan Shilling) must exist');

    const ghs = findCurrencyByCode('GHS');
    assert.ok(ghs, 'GHS (Ghanaian Cedi) must exist');

    const zar = findCurrencyByCode('ZAR');
    assert.ok(zar, 'ZAR (South African Rand) must exist');

    const jpy = findCurrencyByCode('JPY');
    assert.ok(jpy, 'JPY (Japanese Yen) must exist');
  });

  test('searches currencies by country name, currency name, or code', () => {
    const nigeriaSearch = searchCurrencies('Nigeria');
    assert.ok(nigeriaSearch.some((c) => c.code === 'NGN'));

    const nairaSearch = searchCurrencies('Naira');
    assert.ok(nairaSearch.some((c) => c.code === 'NGN'));

    const gbpSearch = searchCurrencies('pound');
    assert.ok(gbpSearch.some((c) => c.code === 'GBP' || c.code === 'EGP'));

    const japanSearch = searchCurrencies('Japan');
    assert.ok(japanSearch.some((c) => c.code === 'JPY'));
  });

  test('converts 5,000 Nigerian Naira (NGN) directly to USDC and SOL equivalent', () => {
    // Standard mock rate snapshot for testing deterministic math:
    // 1 USD = 1,330.995 NGN
    // 1 SOL = $109.38 USD
    const mockRates = {
      success: true,
      base: 'USD',
      solPriceUsd: 109.38,
      rates: {
        USD: 1,
        NGN: 1330.995,
      },
      lastUpdated: Date.now(),
      provider: 'Test Provider',
      isRealTime: true,
    };

    const conversion = currencyRateService.convert(5000, 'NGN', mockRates);
    assert.ok(conversion, 'Conversion should return a valid result');

    // 5000 / 1330.995 ≈ 3.756588... USD / USDC
    const expectedUsdc = 5000 / 1330.995;
    assert.ok(
      Math.abs(conversion.usdcAmount - expectedUsdc) < 0.001,
      `Expected USDC around ${expectedUsdc}, got ${conversion.usdcAmount}`
    );

    // Micro-USDC base units (6 decimals)
    assert.equal(conversion.usdcMicroBaseUnits, 3756588n);

    // SOL: 3.756588 / 109.38 ≈ 0.034344... SOL
    const expectedSol = expectedUsdc / 109.38;
    assert.ok(
      Math.abs(conversion.solAmount - expectedSol) < 0.0001,
      `Expected SOL around ${expectedSol}, got ${conversion.solAmount}`
    );

    // Lamports base units (9 decimals)
    assert.equal(conversion.solLamportsBaseUnits, 34344378n);

    assert.ok(conversion.formattedUSDC.includes('USDC'));
    assert.ok(conversion.formattedSOL.includes('SOL'));
    assert.ok(conversion.rateSummary.includes('NGN'));
  });

  test('converts multiple international currencies to USDC and SOL accurately', () => {
    const testRates = {
      success: true,
      base: 'USD',
      solPriceUsd: 100.0, // Clean round SOL price
      rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.8,
        KES: 130,
        JPY: 150,
      },
      lastUpdated: Date.now(),
      provider: 'Test Provider',
      isRealTime: true,
    };

    // 100 USD -> 100 USDC, 1 SOL
    const usdConv = currencyRateService.convert(100, 'USD', testRates);
    assert.ok(usdConv);
    assert.equal(usdConv.usdcAmount, 100);
    assert.equal(usdConv.solAmount, 1);
    assert.equal(usdConv.usdcMicroBaseUnits, 100_000_000n);
    assert.equal(usdConv.solLamportsBaseUnits, 1_000_000_000n);

    // 92 EUR -> ~100 USDC, ~1 SOL
    const eurConv = currencyRateService.convert(92, 'EUR', testRates);
    assert.ok(eurConv);
    assert.equal(Math.round(eurConv.usdcAmount), 100);
    assert.equal(Math.round(eurConv.solAmount), 1);

    // 13,000 KES -> ~100 USDC, ~1 SOL
    const kesConv = currencyRateService.convert(13000, 'KES', testRates);
    assert.ok(kesConv);
    assert.equal(Math.round(kesConv.usdcAmount), 100);
    assert.equal(Math.round(kesConv.solAmount), 1);
  });

  test('handles invalid inputs gracefully by returning null', () => {
    assert.equal(currencyRateService.convert(0, 'NGN'), null);
    assert.equal(currencyRateService.convert(-500, 'NGN'), null);
    assert.equal(currencyRateService.convert('invalid', 'NGN'), null);
  });
});
