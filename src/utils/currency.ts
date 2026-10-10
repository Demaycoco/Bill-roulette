import { Currency, Table } from '../types';
import { InvalidOrderError } from '../errors';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  SOL: '◎',
};

// Maximum allowed order / bill amount in minor units: $100,000.00 or 10,000 SOL
export const MAX_ORDER_AMOUNT_CENTS = 10_000_000;
export const MIN_ORDER_AMOUNT_CENTS = 0;

/**
 * Validate that an amount in minor units is non-negative and within reasonable dining limits.
 * Throws InvalidOrderError if validation fails.
 */
export function validateOrderAmount(amountCents: number, label = 'Amount'): void {
  if (typeof amountCents !== 'number' || Number.isNaN(amountCents)) {
    throw new InvalidOrderError(`${label} must be a valid number.`);
  }

  if (!Number.isInteger(amountCents)) {
    throw new InvalidOrderError(`${label} must be stored as an exact integer of minor units.`);
  }

  if (amountCents < MIN_ORDER_AMOUNT_CENTS) {
    throw new InvalidOrderError(`${label} cannot be negative.`);
  }

  if (amountCents > MAX_ORDER_AMOUNT_CENTS) {
    throw new InvalidOrderError(`${label} exceeds the maximum supported threshold (${formatCents(MAX_ORDER_AMOUNT_CENTS)}).`);
  }
}

/**
 * Format an integer amount of minor units (cents / lamport subdivisions) into a clean string.
 * Example: 2450 USD -> "$24.50"
 * Example: 10000 SOL -> "◎ 10.000 SOL"
 */
export function formatCents(cents: number, currency: Currency = 'USD'): string {
  const safeInt = Math.round(Number(cents) || 0);

  if (currency === 'SOL') {
    // 1 minor unit in our app is 0.001 SOL (milli-SOL), so 1000 minor units = 1.000 SOL
    const solValue = (safeInt / 1000).toFixed(3);
    return `${CURRENCY_SYMBOLS.SOL} ${solValue} SOL`;
  }

  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  const major = Math.floor(safeInt / 100);
  const minor = Math.abs(safeInt % 100);
  const paddedMinor = minor.toString().padStart(2, '0');

  // Format with thousand separators for large dining bills
  const formattedMajor = major.toLocaleString('en-US');
  return `${symbol}${formattedMajor}.${paddedMinor}`;
}

/**
 * Parse a user input string (e.g. "24.50", "24", "100.99") into integer minor units (cents).
 * Avoids IEEE 754 float precision errors (e.g., 24.5 * 100 = 2449.9999999999995).
 */
export function parseToCents(value: string | number): number {
  if (typeof value === 'number') {
    if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
    return Math.round(value * 100);
  }

  if (!value || typeof value !== 'string') return 0;

  // Clean non-digit and non-period characters
  const cleaned = value.replace(/[^0-9.]/g, '').trim();
  if (!cleaned) return 0;

  const parts = cleaned.split('.');
  const wholePart = parseInt(parts[0], 10) || 0;

  if (parts.length === 1) {
    return wholePart * 100;
  }

  // Decimal part: take first 2 digits, padding with 0 if single digit
  const rawDecimal = parts[1] || '';
  const decimalTwoDigits = (rawDecimal + '00').slice(0, 2);
  const decimalPart = parseInt(decimalTwoDigits, 10) || 0;

  return wholePart * 100 + decimalPart;
}

/**
 * Returns raw decimal representation as string (e.g. 2450 -> "24.50")
 * Useful for prefilling edit inputs without formatting symbols.
 */
export function centsToDecimalString(cents: number): string {
  const safeInt = Math.round(Number(cents) || 0);
  const major = Math.floor(safeInt / 100);
  const minor = Math.abs(safeInt % 100);
  return `${major}.${minor.toString().padStart(2, '0')}`;
}

/**
 * Compute the authoritative total bill in integer minor units.
 */
export function calculateTableTotalCents(table: Table): number {
  if (table.gameMode === 'shared') {
    return Math.max(0, Math.round(table.sharedBillCents || 0));
  }

  // Individual mode: sum all active participant orders strictly in integer minor units
  return table.participants
    .filter((p) => p.status !== 'DISCONNECTED')
    .reduce((acc, p) => acc + (Math.round(p.orderAmountCents) || 0), 0);
}
