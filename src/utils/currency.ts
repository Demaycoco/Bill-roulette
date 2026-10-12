import { Table, Currency } from '../types';
import { InvalidOrderError } from '../errors';

/**
 * Supported currencies for Bill Roulette:
 * 1. SOL: Native Solana currency (9 decimal places, base unit: lamports)
 * 2. USDC: Circle USDC token on Solana (6 decimal places, base unit: micro-USDC)
 *
 * USD, EUR, GBP and other fiat currencies are completely deprecated/disallowed.
 */
export const SUPPORTED_CURRENCIES: readonly Currency[] = ['SOL', 'USDC'] as const;

export const CURRENCY_CONFIG: Record<
  Currency,
  {
    symbol: string;
    label: string;
    decimals: number;
    baseUnitName: string;
    maxBaseUnits: bigint;
    minBaseUnits: bigint;
  }
> = {
  SOL: {
    symbol: '◎',
    label: 'Solana (SOL)',
    decimals: 9,
    baseUnitName: 'lamports',
    maxBaseUnits: 10_000n * 1_000_000_000n, // 10,000 SOL
    minBaseUnits: 0n,
  },
  USDC: {
    symbol: '$',
    label: 'USD Coin (USDC)',
    decimals: 6,
    baseUnitName: 'micro-USDC',
    maxBaseUnits: 500_000n * 1_000_000n, // 500,000 USDC
    minBaseUnits: 0n,
  },
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  SOL: '◎',
  USDC: '$',
};

// Official Solana Mainnet-Beta USDC Mint (Circle-backed official production token)
export const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
export const USDC_MINT = MAINNET_USDC_MINT;
// Alias for backward compatibility
export const DEVNET_USDC_MINT = MAINNET_USDC_MINT;

// Maximum order amount in base units for compatibility (10,000 SOL or 500,000 USDC)
export const MAX_ORDER_AMOUNT_CENTS = 10_000 * 1_000_000_000;
export const MAX_ORDER_AMOUNT_BASE_UNITS = MAX_ORDER_AMOUNT_CENTS;

/**
 * Number of decimal places per currency
 */
export function getCurrencyDecimals(currency: Currency): number {
  return CURRENCY_CONFIG[currency]?.decimals ?? 9;
}

/**
 * Validate that a blockchain base unit integer amount is non-negative and within reasonable bounds.
 */
export function validateOrderBaseUnits(baseUnits: number | bigint, currency: Currency, label = 'Order amount'): void {
  const bi = typeof baseUnits === 'bigint' ? baseUnits : BigInt(Math.trunc(baseUnits));
  const cfg = CURRENCY_CONFIG[currency];
  if (!cfg) {
    throw new InvalidOrderError(`Unsupported currency: ${currency}. Only SOL and USDC are supported.`);
  }

  if (bi < cfg.minBaseUnits) {
    throw new InvalidOrderError(`${label} cannot be negative.`);
  }

  if (bi > cfg.maxBaseUnits) {
    throw new InvalidOrderError(
      `${label} exceeds the maximum supported threshold (${formatBaseUnits(cfg.maxBaseUnits, currency)}).`
    );
  }
}

/**
 * Backward compatibility alias: validates integer base units
 */
export function validateOrderAmount(amountBaseUnits: number, label = 'Amount'): void {
  if (typeof amountBaseUnits !== 'number' || Number.isNaN(amountBaseUnits) || !Number.isFinite(amountBaseUnits)) {
    throw new InvalidOrderError(`${label} must be a valid number.`);
  }
  if (!Number.isInteger(amountBaseUnits)) {
    throw new InvalidOrderError(`${label} must be an integer of base units.`);
  }
  if (amountBaseUnits < 0) {
    throw new InvalidOrderError(`${label} cannot be negative.`);
  }
  if (amountBaseUnits > MAX_ORDER_AMOUNT_CENTS) {
    throw new InvalidOrderError(`${label} exceeds maximum allowed limit.`);
  }
}

/**
 * Parse a decimal string (e.g. "0.25", "12.50", "0.0035") into exact integer base units (lamports or micro-USDC).
 * Avoids IEEE 754 floating point arithmetic precision drift.
 *
 * Examples:
 * parseToBaseUnits("0.25", "SOL")   -> 250_000_000n (lamports)
 * parseToBaseUnits("12.50", "USDC") -> 12_500_000n (micro-USDC)
 * parseToBaseUnits("0.0035", "SOL") -> 3_500_000n (lamports)
 */
export function parseToBaseUnits(value: string | number, currency: Currency): bigint {
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value) || value < 0) return 0n;
    value = value.toString();
  }

  if (!value || typeof value !== 'string') return 0n;

  const cleaned = value.replace(/[^0-9.]/g, '').trim();
  if (!cleaned) return 0n;

  const parts = cleaned.split('.');
  const wholeStr = parts[0] || '0';
  const decimals = getCurrencyDecimals(currency);

  const rawFraction = parts.length > 1 ? parts[1] : '';
  // Truncate to maximum decimals supported by mint
  const fractionStr = rawFraction.slice(0, decimals).padEnd(decimals, '0');

  try {
    const wholeBig = BigInt(wholeStr || '0');
    const fracBig = BigInt(fractionStr || '0');
    const multiplier = 10n ** BigInt(decimals);
    return wholeBig * multiplier + fracBig;
  } catch {
    return 0n;
  }
}

/**
 * Backward-compatible parse function returning minor units / base units.
 * If currency is not specified or legacy decimal cents are expected, converts decimal dollars/euros/etc into integer cents (e.g. "24.50" -> 2450).
 * If currency is specified as 'SOL', converts to lamports (9 decimals).
 * If currency is specified as 'USDC', converts to micro-USDC (6 decimals).
 */
export function parseToCents(value: string | number, currency?: Currency): number {
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value) || value < 0) return 0;
    value = value.toString();
  }
  if (!value || typeof value !== 'string') return 0;

  if (currency === 'SOL' || currency === 'USDC') {
    return Number(parseToBaseUnits(value, currency));
  }

  // Legacy decimal format: 2 decimal places (cents)
  const cleaned = value.replace(/[^0-9.]/g, '').trim();
  if (!cleaned) return 0;
  const parts = cleaned.split('.');
  const whole = parseInt(parts[0] || '0', 10);
  const frac = parts.length > 1 ? parts[1].slice(0, 2).padEnd(2, '0') : '00';
  return whole * 100 + parseInt(frac, 10);
}

/**
 * Format exact base units (BigInt or number) into a clean, precise string.
 * Respects exact currency formatting without losing precision or rounding down.
 *
 * Examples:
 * formatBaseUnits(250_000_000n, "SOL")   -> "0.25 SOL"
 * formatBaseUnits(12_500_000n, "USDC")   -> "12.50 USDC"
 * formatBaseUnits(3_500_000n, "SOL")    -> "0.0035 SOL"
 * formatBaseUnits(0n, "SOL")            -> "0 SOL"
 */
export function formatBaseUnits(
  baseUnits: bigint | number,
  currency: Currency,
  opts?: { includeSymbol?: boolean; includeCode?: boolean }
): string {
  const includeSymbol = opts?.includeSymbol ?? false;
  const includeCode = opts?.includeCode ?? true;

  const bi = typeof baseUnits === 'bigint' ? baseUnits : BigInt(Math.max(0, Math.trunc(baseUnits || 0)));
  const decimals = getCurrencyDecimals(currency);
  const divisor = 10n ** BigInt(decimals);

  const whole = bi / divisor;
  const remainder = bi % divisor;

  let formattedNum = whole.toLocaleString('en-US');

  if (remainder > 0n) {
    const remStr = remainder.toString().padStart(decimals, '0');
    // For USDC, display standard 2 decimal places if trailing zeros, or up to 6 if fractional cents
    // For SOL, trim trailing zeros but preserve up to 9 decimal places
    let trimmed = remStr.replace(/0+$/, '');
    if (currency === 'USDC' && trimmed.length < 2) {
      trimmed = trimmed.padEnd(2, '0');
    }
    formattedNum += `.${trimmed}`;
  } else if (currency === 'USDC') {
    formattedNum += '.00';
  }

  const symbolPrefix = includeSymbol && CURRENCY_SYMBOLS[currency] ? `${CURRENCY_SYMBOLS[currency]} ` : '';
  const codeSuffix = includeCode ? ` ${currency}` : '';

  return `${symbolPrefix}${formattedNum}${codeSuffix}`;
}

/**
 * Drop-in backward-compatible formatter matching formatCents signature.
 */
export function formatCents(cents: number | bigint, currency: Currency = 'SOL'): string {
  return formatBaseUnits(cents, currency, { includeSymbol: false, includeCode: true });
}

/**
 * Format base units into raw editable decimal string without currency symbols or thousands commas.
 * Useful for prefilling input fields.
 *
 * Example: 250_000_000 lamports SOL -> "0.25"
 * Example: 12_500_000 micro-USDC -> "12.50"
 */
export function baseUnitsToDecimalString(baseUnits: bigint | number, currency: Currency): string {
  const bi = typeof baseUnits === 'bigint' ? baseUnits : BigInt(Math.max(0, Math.trunc(baseUnits || 0)));
  if (bi === 0n) return '';

  const decimals = getCurrencyDecimals(currency);
  const divisor = 10n ** BigInt(decimals);

  const whole = bi / divisor;
  const remainder = bi % divisor;

  if (remainder === 0n) {
    return currency === 'USDC' ? `${whole}.00` : whole.toString();
  }

  const remStr = remainder.toString().padStart(decimals, '0');
  let trimmed = remStr.replace(/0+$/, '');
  if (currency === 'USDC' && trimmed.length < 2) {
    trimmed = trimmed.padEnd(2, '0');
  }
  return `${whole}.${trimmed}`;
}

/**
 * Backward compatibility alias
 */
export function centsToDecimalString(cents: number, currency: Currency = 'SOL'): string {
  return baseUnitsToDecimalString(cents, currency);
}

/**
 * Compute the authoritative table total in base units.
 * Note: A table operates with a single authoritative table currency.
 */
export function calculateTableTotalCents(table: Table): number {
  if (table.gameMode === 'shared') {
    return Math.max(0, Math.trunc(table.sharedBillCents || 0));
  }

  return table.participants
    .filter((p) => p.status !== 'DISCONNECTED')
    .reduce((acc, p) => acc + (Math.trunc(p.orderAmountCents) || 0), 0);
}

/**
 * Calculate table total returning exact BigInt base units.
 */
export function calculateTableTotalBaseUnits(table: Table): bigint {
  if (table.gameMode === 'shared') {
    return BigInt(Math.max(0, Math.trunc(table.sharedBillCents || 0)));
  }

  return table.participants
    .filter((p) => p.status !== 'DISCONNECTED')
    .reduce((acc, p) => acc + BigInt(Math.trunc(p.orderAmountCents || 0)), 0n);
}

/**
 * Conversion estimate helper between SOL and USDC.
 * Clearly marks the conversion as an estimate with rate details.
 * If no conversion rate is available, returns null rather than inventing a rate.
 */
export interface ConversionEstimate {
  originalAmount: string;
  originalCurrency: Currency;
  convertedAmount: string;
  targetCurrency: Currency;
  rateDescription: string;
  timestamp: number;
}

export function computeEstimatedConversion(
  amountBaseUnits: bigint | number,
  fromCurrency: Currency,
  toCurrency: Currency,
  solUsdRate: number | null
): ConversionEstimate | null {
  if (fromCurrency === toCurrency) return null;
  if (!solUsdRate || solUsdRate <= 0) return null;

  const originalStr = formatBaseUnits(amountBaseUnits, fromCurrency);

  if (fromCurrency === 'SOL' && toCurrency === 'USDC') {
    // Lamports to micro-USDC: (lamports / 1e9) * solUsdRate * 1e6
    const solFloat = Number(amountBaseUnits) / 1e9;
    const usdcFloat = solFloat * solUsdRate;
    const usdcMicro = BigInt(Math.round(usdcFloat * 1e6));
    return {
      originalAmount: originalStr,
      originalCurrency: 'SOL',
      convertedAmount: formatBaseUnits(usdcMicro, 'USDC'),
      targetCurrency: 'USDC',
      rateDescription: `1 SOL ≈ $${solUsdRate.toFixed(2)} USDC`,
      timestamp: Date.now(),
    };
  }

  if (fromCurrency === 'USDC' && toCurrency === 'SOL') {
    // Micro-USDC to lamports: (microUSDC / 1e6) / solUsdRate * 1e9
    const usdcFloat = Number(amountBaseUnits) / 1e6;
    const solFloat = usdcFloat / solUsdRate;
    const solLamports = BigInt(Math.round(solFloat * 1e9));
    return {
      originalAmount: originalStr,
      originalCurrency: 'USDC',
      convertedAmount: formatBaseUnits(solLamports, 'SOL'),
      targetCurrency: 'SOL',
      rateDescription: `1 SOL ≈ $${solUsdRate.toFixed(2)} USDC`,
      timestamp: Date.now(),
    };
  }

  return null;
}
