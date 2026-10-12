import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  ArrowRightLeft,
  ChevronDown,
  RefreshCw,
  Copy,
  Check,
  Search,
  Sparkles,
  Globe2,
  X,
} from 'lucide-react';
import {
  currencyRateService,
  useCurrencyRates,
  CurrencyConversion,
} from '../services/currencyRateService';
import {
  WORLD_CURRENCIES,
  WorldCurrency,
  searchCurrencies,
  findCurrencyByCode,
} from '../utils/worldCurrencies';

export interface CurrencyConverterProps {
  initialCurrencyCode?: string;
  initialAmount?: string;
  onApplyAmount?: (amountDecimal: string, currency: 'USDC' | 'SOL') => void;
  targetCurrency?: 'USDC' | 'SOL';
  className?: string;
  defaultExpanded?: boolean;
  variant?: 'card' | 'banner';
  title?: string;
  subtitle?: string;
}

const POPULAR_SHORTCUTS = [
  'NGN',
  'USD',
  'EUR',
  'GBP',
  'KES',
  'GHS',
  'ZAR',
  'INR',
  'CAD',
  'AUD',
  'JPY',
  'AED',
];

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  initialCurrencyCode = 'NGN',
  initialAmount = '5000',
  onApplyAmount,
  targetCurrency,
  className = '',
  defaultExpanded = true,
  variant = 'card',
  title = 'Currency Converter (Live Rates)',
  subtitle = 'Bought food or drinks in local currency? Type what you bought to convert straight to USDC & SOL.',
}) => {
  const { ratesData, loading, refreshRates } = useCurrencyRates();

  const [amountStr, setAmountStr] = useState<string>(initialAmount);
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(initialCurrencyCode);
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState<boolean>(defaultExpanded);
  const [copiedType, setCopiedType] = useState<'usdc' | 'sol' | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
    }
    if (isCurrencyDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCurrencyDropdownOpen]);

  const selectedCurrency: WorldCurrency = useMemo(() => {
    return (
      findCurrencyByCode(selectedCurrencyCode) || {
        code: selectedCurrencyCode,
        name: selectedCurrencyCode,
        country: 'Worldwide',
        flag: '🌍',
        symbol: selectedCurrencyCode,
      }
    );
  }, [selectedCurrencyCode]);

  const filteredCurrencies = useMemo(() => {
    return searchCurrencies(searchQuery);
  }, [searchQuery]);

  const conversion: CurrencyConversion | null = useMemo(() => {
    const cleanNum = parseFloat(amountStr.replace(/,/g, ''));
    if (isNaN(cleanNum) || cleanNum <= 0) return null;
    return currencyRateService.convert(cleanNum, selectedCurrencyCode, ratesData);
  }, [amountStr, selectedCurrencyCode, ratesData]);

  const handleCopy = async (text: string, type: 'usdc' | 'sol') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 1800);
    } catch {
      // fallback
    }
  };

  const handlePresetAdd = (addedValue: number) => {
    const current = parseFloat(amountStr.replace(/,/g, '')) || 0;
    const next = current + addedValue;
    setAmountStr(next.toString());
  };

  // ----------------------------------------------------
  // CARD VARIANT (Embedded inside Start / Join Table)
  // ----------------------------------------------------
  if (variant === 'card') {
    return (
      <div
        className={`rounded-2xl border border-[#233327] bg-gradient-to-b from-[#101813] to-[#0A0E0C] text-[#F5F7F2] p-4 sm:p-5 relative shadow-xl overflow-hidden ${className}`}
      >
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1C281F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 flex items-center justify-center text-[#C8FF3D] shrink-0">
              <Globe2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">{title}</h3>
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Real Market Data</span>
                </span>
              </div>
              <p className="text-xs text-[#8D958C] mt-0.5">{subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {ratesData && (
              <span className="hidden sm:inline-block font-mono text-[11px] text-[#A4B0A3] bg-[#162019] px-2 py-1 rounded-lg border border-[#233126]">
                1 SOL ≈ ${ratesData.solPriceUsd.toFixed(2)}
              </span>
            )}
            <button
              type="button"
              onClick={() => refreshRates()}
              disabled={loading}
              title="Refresh live market exchange rates"
              className="p-1.5 rounded-lg bg-[#162019] hover:bg-[#1D2B21] border border-[#233126] text-[#8D958C] hover:text-[#C8FF3D] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C8FF3D]' : ''}`} />
            </button>
          </div>
        </div>

        {/* Popular Shortcuts */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 border-b border-[#18231B] scrollbar-none">
          <span className="text-[11px] text-[#6E7B6D] font-medium whitespace-nowrap mr-1">
            Country:
          </span>
          {POPULAR_SHORTCUTS.map((code) => {
            const curr = findCurrencyByCode(code);
            if (!curr) return null;
            const isSelected = selectedCurrencyCode === code;
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setSelectedCurrencyCode(code);
                  setIsCurrencyDropdownOpen(false);
                }}
                className={`px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap flex items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#C8FF3D] text-[#050505] font-bold shadow-sm shadow-[#C8FF3D]/25'
                    : 'bg-[#141C16] text-[#A4B0A3] hover:text-white hover:bg-[#1B271E] border border-[#1E2B21]'
                }`}
              >
                <span>{curr.flag}</span>
                <span>{curr.code}</span>
              </button>
            );
          })}
        </div>

        {/* Input & Output Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 pt-3.5 items-stretch">
          {/* Left Column: Local Currency Amount & Currency Selector (5 cols) */}
          <div className="lg:col-span-5 bg-[#0C120E] p-3.5 rounded-xl border border-[#1E2C21] flex flex-col justify-between">
            <label className="text-xs font-semibold text-[#A4B0A3] mb-1.5 flex items-center justify-between">
              <span>What did you buy? (Local Amount)</span>
              <span className="text-[11px] text-[#6E7B6C] truncate max-w-[150px]">
                {selectedCurrency.country}
              </span>
            </label>

            {/* Amount input + Currency selector container */}
            <div className="relative flex items-center rounded-xl bg-[#070A08] border border-[#233126] focus-within:border-[#C8FF3D]/70 focus-within:ring-1 focus-within:ring-[#C8FF3D]/30 transition-all overflow-visible">
              {/* Currency Picker Button */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                  className="h-11 px-3 flex items-center gap-1.5 bg-[#141E17] hover:bg-[#1B281F] border-r border-[#233126] transition-colors cursor-pointer text-left"
                >
                  <span className="text-base leading-none">{selectedCurrency.flag}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white tracking-wide leading-tight">
                      {selectedCurrency.code}
                    </span>
                    <span className="text-[10px] text-[#8D958C] leading-none">
                      {selectedCurrency.symbol}
                    </span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8D958C] ml-0.5" />
                </button>

                {/* Currency Dropdown Popover */}
                {isCurrencyDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-72 sm:w-80 max-h-80 bg-[#121914] border border-[#26372A] rounded-xl shadow-2xl z-50 flex flex-col overflow-hidden backdrop-blur-md">
                    {/* Search header */}
                    <div className="p-2.5 border-b border-[#212E24] bg-[#0E1510] sticky top-0 flex items-center gap-2">
                      <Search className="w-4 h-4 text-[#8D958C]" />
                      <input
                        type="text"
                        placeholder="Search all 160+ world currencies..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-transparent text-xs text-white placeholder-[#606E5F] w-full focus:outline-none"
                        autoFocus
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-[#8D958C] hover:text-white p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Currencies List */}
                    <div className="overflow-y-auto max-h-64 p-1 space-y-0.5">
                      {filteredCurrencies.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#8D958C]">
                          No currency found for "{searchQuery}"
                        </div>
                      ) : (
                        filteredCurrencies.map((c) => {
                          const isSelected = c.code === selectedCurrencyCode;
                          const rate = ratesData?.rates[c.code];
                          return (
                            <button
                              key={c.code}
                              type="button"
                              onClick={() => {
                                setSelectedCurrencyCode(c.code);
                                setIsCurrencyDropdownOpen(false);
                                setSearchQuery('');
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg flex items-center justify-between text-left text-xs transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#C8FF3D]/15 text-[#C8FF3D] font-semibold'
                                  : 'hover:bg-[#1A251D] text-[#D8DFD7]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className="text-base">{c.flag}</span>
                                <div className="min-w-0 truncate">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-white">{c.code}</span>
                                    <span className="text-[11px] text-[#8D958C] truncate">
                                      ({c.country})
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-[#717E6F] truncate">
                                    {c.name} • {c.symbol}
                                  </div>
                                </div>
                              </div>

                              {rate && (
                                <span className="font-mono text-[10px] text-[#8D958C] shrink-0 ml-2">
                                  {rate >= 100 ? rate.toFixed(1) : rate.toFixed(2)}/USD
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Input Field */}
              <div className="flex-1 flex items-center px-3">
                <span className="text-base font-semibold text-[#8D958C] mr-2">
                  {selectedCurrency.symbol}
                </span>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="e.g. 5000"
                  className="w-full bg-transparent text-lg font-bold text-white placeholder-[#4C5B4E] focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Preset increments */}
            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
              <span className="text-[10px] text-[#697467] font-medium mr-1">Quick add:</span>
              {[500, 1000, 5000, 10000, 50000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handlePresetAdd(val)}
                  className="px-2 py-0.5 rounded bg-[#141C16] hover:bg-[#1D2920] text-[10px] font-mono text-[#A4B0A3] hover:text-[#C8FF3D] border border-[#202E23] transition-colors cursor-pointer"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmountStr('5000')}
                className="px-2 py-0.5 rounded bg-[#17221A] hover:bg-[#202E24] text-[10px] font-mono text-[#C8FF3D] border border-[#243527] transition-colors cursor-pointer ml-auto"
              >
                5,000 NGN
              </button>
            </div>
          </div>

          {/* Arrow divider */}
          <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
            <div className="w-8 h-8 rounded-full bg-[#141E17] border border-[#212E23] flex items-center justify-center text-[#C8FF3D]">
              <ArrowRightLeft className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Right Column: USDC & SOL Results (6 cols) */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
            {/* USDC Result Card */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                targetCurrency === 'USDC'
                  ? 'bg-[#0E1712] border-[#2775CA] shadow-[0_0_12px_rgba(39,117,202,0.2)]'
                  : 'bg-[#0C120E] border-[#1F2C21] hover:border-[#2775CA]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#2775CA]/20 border border-[#2775CA]/40 flex items-center justify-center text-[#2775CA] font-bold text-[10px]">
                    $
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">USDC</span>
                    <span className="text-[9px] text-[#8D958C]">USD Coin</span>
                  </div>
                </div>

                {conversion && (
                  <button
                    type="button"
                    onClick={() => handleCopy(conversion.usdcAmount.toFixed(2), 'usdc')}
                    className="p-1 rounded bg-[#151E18] hover:bg-[#1D2920] text-[#A4B0A3] hover:text-[#C8FF3D] transition-colors cursor-pointer"
                    title="Copy USDC amount"
                  >
                    {copiedType === 'usdc' ? (
                      <Check className="w-3 h-3 text-[#C8FF3D]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              <div className="my-1.5">
                {conversion ? (
                  <>
                    <div className="text-lg sm:text-xl font-black text-white font-mono tracking-tight text-[#E8ECE5]">
                      ${conversion.usdcAmount >= 1
                        ? conversion.usdcAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })
                        : conversion.usdcAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4,
                          })}
                      <span className="text-[10px] text-[#2775CA] font-sans font-bold ml-1">
                        USDC
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-[#6E7D6D] mt-0.5 truncate">
                      ≈ {conversion.usdcMicroBaseUnits.toLocaleString()} micro-USDC
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[#697467] py-1 font-mono">— USDC</div>
                )}
              </div>

              {/* Apply action button */}
              {onApplyAmount && conversion && (
                <button
                  type="button"
                  onClick={() => onApplyAmount(conversion.usdcAmount.toFixed(2), 'USDC')}
                  className={`mt-1.5 w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    targetCurrency === 'USDC'
                      ? 'bg-[#2775CA] text-white hover:bg-[#1E65B3] shadow-md shadow-[#2775CA]/25'
                      : 'bg-[#2775CA]/15 hover:bg-[#2775CA]/25 border border-[#2775CA]/30 text-[#8BC0FA]'
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                  <span>Use as Bill (USDC)</span>
                </button>
              )}
            </div>

            {/* SOL Result Card */}
            <div
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all relative overflow-hidden ${
                targetCurrency === 'SOL'
                  ? 'bg-[#121A15] border-[#C8FF3D] shadow-[0_0_12px_rgba(200,255,61,0.2)]'
                  : 'bg-[#0C120E] border-[#1F2C21] hover:border-[#C8FF3D]/50'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#C8FF3D]/20 border border-[#C8FF3D]/40 flex items-center justify-center text-[#C8FF3D] font-bold text-[10px]">
                    ◎
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block leading-tight">SOL</span>
                    <span className="text-[9px] text-[#8D958C]">Native Solana</span>
                  </div>
                </div>

                {conversion && (
                  <button
                    type="button"
                    onClick={() => handleCopy(conversion.solAmount.toFixed(4), 'sol')}
                    className="p-1 rounded bg-[#151E18] hover:bg-[#1D2920] text-[#A4B0A3] hover:text-[#C8FF3D] transition-colors cursor-pointer"
                    title="Copy SOL amount"
                  >
                    {copiedType === 'sol' ? (
                      <Check className="w-3 h-3 text-[#C8FF3D]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>

              <div className="my-1.5">
                {conversion ? (
                  <>
                    <div className="text-lg sm:text-xl font-black text-white font-mono tracking-tight text-[#F2F6ED]">
                      ◎{' '}
                      {conversion.solAmount >= 1
                        ? conversion.solAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 4,
                          })
                        : conversion.solAmount.toLocaleString('en-US', {
                            minimumFractionDigits: 4,
                            maximumFractionDigits: 6,
                          })}
                      <span className="text-[10px] text-[#C8FF3D] font-sans font-bold ml-1">
                        SOL
                      </span>
                    </div>
                    <div className="text-[9px] font-mono text-[#6E7D6D] mt-0.5 truncate">
                      ≈ {conversion.solLamportsBaseUnits.toLocaleString()} lamports
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-[#697467] py-1 font-mono">— SOL</div>
                )}
              </div>

              {/* Apply action button */}
              {onApplyAmount && conversion && (
                <button
                  type="button"
                  onClick={() => onApplyAmount(conversion.solAmount.toFixed(4), 'SOL')}
                  className={`mt-1.5 w-full py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                    targetCurrency === 'SOL'
                      ? 'bg-[#C8FF3D] text-[#050505] hover:bg-[#b8f328] shadow-md shadow-[#C8FF3D]/25 font-bold'
                      : 'bg-[#C8FF3D]/15 hover:bg-[#C8FF3D]/25 border border-[#C8FF3D]/30 text-[#C8FF3D]'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Use as Bill (SOL)</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Real-time verification notice */}
        {conversion && (
          <div className="mt-3 pt-2.5 border-t border-[#18231B] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[10px] text-[#788576]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[#A4B0A3] font-medium">Formula:</span>
              <span className="font-mono bg-[#121A15] px-1.5 py-0.5 rounded text-[#93A192]">
                {conversion.inputAmount.toLocaleString()} {conversion.currency.code} ÷{' '}
                {conversion.rateToUsd >= 100
                  ? conversion.rateToUsd.toFixed(2)
                  : conversion.rateToUsd.toFixed(4)}{' '}
                = ${conversion.usdcAmount.toFixed(2)} USDC ÷ $
                {conversion.solPriceUsd.toFixed(2)} = {conversion.solAmount.toFixed(4)} SOL
              </span>
            </div>

            <div className="flex items-center gap-1 text-[9px] text-[#697467]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Real rates via {ratesData?.provider || 'Live Interbank Rates'}</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // BANNER VARIANT (Fallback top banner if needed)
  // ----------------------------------------------------
  return (
    <div
      className={`w-full bg-gradient-to-b from-[#111713] to-[#0A0E0C] border-b border-[#1E2A21] text-[#F5F7F2] relative transition-all duration-200 ${className}`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 text-[#C8FF3D] font-medium text-[11px]">
            <Globe2 className="w-3 h-3" />
            <span>{title}</span>
          </div>
          {ratesData && (
            <span className="hidden md:inline-block font-mono text-[11px] text-[#A4B0A3]">
              1 SOL ≈ ${ratesData.solPriceUsd.toFixed(2)} USDC
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refreshRates()}
            disabled={loading}
            className="p-1 rounded-lg text-[#8D958C] hover:text-[#C8FF3D]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#C8FF3D]' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-lg bg-[#18221B] text-[#C8FF3D] text-xs flex items-center gap-1"
          >
            <span>{isExpanded ? 'Hide' : 'Open'}</span>
            <ChevronDown className={`w-3.5 h-3.5 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </div>
  );
};
