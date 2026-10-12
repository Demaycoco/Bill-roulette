import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Users, Receipt, Sparkles, ExternalLink, ShieldCheck } from 'lucide-react';
import { Currency, GameMode, Table } from '../types';
import { tableService } from '../services/tableService';
import { CurrencyConverter } from '../components/CurrencyConverter';
import {
  parseToBaseUnits,
  formatBaseUnits,
  MAINNET_USDC_MINT,
  SUPPORTED_CURRENCIES,
  getCurrencyDecimals,
} from '../utils/currency';

interface CreateTablePageProps {
  hostWalletAddress?: string;
  onBack: () => void;
  onTableCreated: (table: Table) => void;
  initialPrefilledAmount?: { amount: string; currency: Currency } | null;
}

export const CreateTablePage: React.FC<CreateTablePageProps> = ({
  hostWalletAddress,
  onBack,
  onTableCreated,
  initialPrefilledAmount,
}) => {
  const [tableName, setTableName] = useState('');
  const [hostName, setHostName] = useState('');
  const [currency, setCurrency] = useState<Currency>(initialPrefilledAmount?.currency || 'SOL');
  const [gameMode, setGameMode] = useState<GameMode>('individual');
  const [initialOrderStr, setInitialOrderStr] = useState(
    initialPrefilledAmount && gameMode === 'individual' ? initialPrefilledAmount.amount : ''
  );
  const [sharedBillStr, setSharedBillStr] = useState(
    initialPrefilledAmount && gameMode === 'shared' ? initialPrefilledAmount.amount : ''
  );

  React.useEffect(() => {
    if (initialPrefilledAmount) {
      setCurrency(initialPrefilledAmount.currency);
      if (gameMode === 'individual') {
        setInitialOrderStr(initialPrefilledAmount.amount);
      } else {
        setSharedBillStr(initialPrefilledAmount.amount);
      }
    }
  }, [initialPrefilledAmount, gameMode]);

  const [createdTable, setCreatedTable] = useState<Table | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!tableName.trim()) {
      setError('Please provide a name for this table (e.g., "Friday Tapas & Drinks").');
      return;
    }
    if (!hostName.trim()) {
      setError('Please provide your name as the table host.');
      return;
    }

    try {
      const hostOrderBaseUnits =
        gameMode === 'individual' ? Number(parseToBaseUnits(initialOrderStr, currency)) : 0;
      const sharedTotalBaseUnits =
        gameMode === 'shared' ? Number(parseToBaseUnits(sharedBillStr, currency)) : 0;

      const table = await tableService.createTable({
        name: tableName,
        hostName,
        currency,
        gameMode,
        hostWallet: hostWalletAddress,
        initialHostOrderCents: hostOrderBaseUnits,
        sharedBillCents: sharedTotalBaseUnits,
      });

      setCreatedTable(table);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table.');
    }
  };

  const handleCopyCode = async () => {
    if (!createdTable) return;
    try {
      await navigator.clipboard.writeText(createdTable.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleCopyInviteLink = async () => {
    if (!createdTable) return;
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const inviteUrl = `${origin}?code=${createdTable.roomCode}`;
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      {/* Top back navigation */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-[#8D958C] hover:text-[#F5F7F2] transition-colors mb-6 cursor-pointer py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {!createdTable ? (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F7F2]">
              Start a Table
            </h1>
            <p className="text-sm text-[#8D958C] mt-1">
              Create a dining table and invite friends to log their orders before the spin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs">
                {error}
              </div>
            )}

            {/* Table Name */}
            <div className="space-y-1.5">
              <label htmlFor="tableName" className="block text-xs font-semibold text-[#F5F7F2]">
                Table Name
              </label>
              <input
                id="tableName"
                type="text"
                placeholder="e.g. Nobu Tasting Menu, Taco Tuesday"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-[#F5F7F2] placeholder-[#525A51] text-sm focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
                maxLength={45}
              />
            </div>

            {/* Host Name */}
            <div className="space-y-1.5">
              <label htmlFor="hostName" className="block text-xs font-semibold text-[#F5F7F2]">
                Your Name (Table Host)
              </label>
              <input
                id="hostName"
                type="text"
                placeholder="e.g. Jordan K."
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-[#F5F7F2] placeholder-[#525A51] text-sm focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
                maxLength={30}
              />
            </div>

            {/* Currency Selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#F5F7F2]">Table Currency</label>
                <span className="text-[11px] font-mono text-[#8D958C]">
                  {currency === 'SOL' ? '9 decimals (lamports)' : '6 decimals (Circle Mainnet USDC)'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  key="SOL"
                  type="button"
                  onClick={() => setCurrency('SOL')}
                  className={`h-14 px-4 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    currency === 'SOL'
                      ? 'bg-[#121814] text-white border-2 border-[#C8FF3D] shadow-[0_0_16px_rgba(200,255,61,0.2)]'
                      : 'bg-[#0B0F0D] text-[#8D958C] border border-[#1F2922] hover:text-white hover:border-[#2C3830]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-black border border-[#1F2922] flex items-center justify-center font-bold text-sm text-[#C8FF3D]">
                      ◎
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">SOL</div>
                      <div className="text-[10px] text-[#8D958C]">Native Solana</div>
                    </div>
                  </div>
                  {currency === 'SOL' && (
                    <span className="w-2 h-2 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
                  )}
                </button>

                <button
                  key="USDC"
                  type="button"
                  onClick={() => setCurrency('USDC')}
                  className={`h-14 px-4 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                    currency === 'USDC'
                      ? 'bg-[#121814] text-white border-2 border-[#C8FF3D] shadow-[0_0_16px_rgba(200,255,61,0.2)]'
                      : 'bg-[#0B0F0D] text-[#8D958C] border border-[#1F2922] hover:text-white hover:border-[#2C3830]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-black border border-[#1F2922] flex items-center justify-center font-bold text-sm text-[#2775CA]">
                      $
                    </span>
                    <div className="text-left">
                      <div className="text-xs font-bold text-white">USDC</div>
                      <div className="text-[10px] text-[#8D958C]">SPL Token</div>
                    </div>
                  </div>
                  {currency === 'USDC' && (
                    <span className="w-2 h-2 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
                  )}
                </button>
              </div>

              {currency === 'USDC' && (
                <div className="p-2.5 rounded-lg bg-[#050505] border border-[#1F2922] flex items-center justify-between text-[11px] text-[#8D958C]">
                  <span className="flex items-center gap-1.5 text-zinc-300">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D]" />
                    <span>Mainnet Verified Mint:</span>
                  </span>
                  <span className="font-mono text-[#C8FF3D] text-[10px]">
                    EPjFW...TDt1v (Circle)
                  </span>
                </div>
              )}
            </div>

            {/* Game Mode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#F5F7F2]">Game Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGameMode('individual')}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                    gameMode === 'individual'
                      ? 'bg-[#121814] border-[#C8FF3D] text-white shadow-[0_0_12px_rgba(200,255,61,0.15)]'
                      : 'bg-[#0B0F0D] border-[#1F2922] text-[#8D958C] hover:border-[#2C3830]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-[#C8FF3D]" />
                    <span className="text-xs font-bold text-white">Individual Orders</span>
                  </div>
                  <p className="text-[11px] text-[#8D958C] leading-snug">
                    Each participant enters their own items/amount. The wheel tallies the sum.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('shared')}
                  className={`p-4 rounded-xl text-left border transition-all cursor-pointer ${
                    gameMode === 'shared'
                      ? 'bg-[#121814] border-[#C8FF3D] text-white shadow-[0_0_12px_rgba(200,255,61,0.15)]'
                      : 'bg-[#0B0F0D] border-[#1F2922] text-[#8D958C] hover:border-[#2C3830]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="w-4 h-4 text-[#C8FF3D]" />
                    <span className="text-xs font-bold text-white">Shared Bill</span>
                  </div>
                  <p className="text-[11px] text-[#8D958C] leading-snug">
                    Enter one total bill directly from the restaurant receipt.
                  </p>
                </button>
              </div>
            </div>

            {/* Currency Converter for What You Bought (Real Live Rates) */}
            <CurrencyConverter
              variant="card"
              initialCurrencyCode="NGN"
              initialAmount="5000"
              targetCurrency={currency}
              title="Currency Converter (What You Bought)"
              subtitle="Convert what you bought in any country's currency (e.g. 5,000 NGN) straight to USDC & SOL for your table bill."
              onApplyAmount={(amountDecimal, chosenCurrency) => {
                setCurrency(chosenCurrency);
                if (gameMode === 'individual') {
                  setInitialOrderStr(amountDecimal);
                } else {
                  setSharedBillStr(amountDecimal);
                }
              }}
            />

            {/* Mode-specific initial amount field */}
            {gameMode === 'individual' ? (
              <div className="space-y-1.5">
                <label htmlFor="initialOrder" className="block text-xs font-semibold text-[#F5F7F2]">
                  Your Order Amount ({currency})
                </label>
                <div className="relative">
                  <input
                    id="initialOrder"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={initialOrderStr}
                    onChange={(e) => setInitialOrderStr(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-white placeholder-[#525A51] text-sm font-mono focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8D958C]">
                    {currency}
                  </div>
                </div>
                <p className="text-[11px] text-[#8D958C]">
                  Stored as exact integer base units ({currency === 'SOL' ? 'lamports' : 'micro-USDC'}). Exact precision preserved.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="sharedBill" className="block text-xs font-semibold text-[#F5F7F2]">
                  Total Bill From Receipt ({currency})
                </label>
                <div className="relative">
                  <input
                    id="sharedBill"
                    type="text"
                    inputMode="decimal"
                    placeholder="150.00"
                    value={sharedBillStr}
                    onChange={(e) => setSharedBillStr(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-white placeholder-[#525A51] text-sm font-mono focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[#8D958C]">
                    {currency}
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Storage Disclosure */}
            <div className="p-3.5 rounded-xl bg-[#0B0F0D] border border-[#1C251F] text-[11px] text-[#8D958C]">
              <span className="font-semibold text-[#F5F7F2]">Architecture Note:</span> Table draft state is managed in low-latency ephemeral storage. The final settlement and VRF randomness result are recorded and verified on Solana Mainnet Beta when the spin executes.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#C8FF3D] text-[#050505] font-bold text-sm hover:bg-[#bbf330] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,255,61,0.22)] cursor-pointer"
            >
              <span>Create Table</span>
            </button>
          </form>
        </div>
      ) : (
        /* Post-Creation Success View */
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0B0F0D] border border-[#1C251F] space-y-6 text-center shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#C8FF3D]" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Table Created!
              </h2>
              <p className="text-xs text-[#8D958C]">
                Share this room code with everyone sitting at <span className="text-[#F5F7F2] font-semibold">{createdTable.name}</span>.
              </p>
            </div>

            {/* Large Room Code Display */}
            <div className="p-5 rounded-2xl bg-[#050505] border border-[#1F2922] flex flex-col items-center justify-center gap-2 shadow-inner">
              <span className="text-[11px] uppercase tracking-wider text-[#8D958C] font-semibold">
                Room Code
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-[#C8FF3D]">
                {createdTable.roomCode}
              </span>
            </div>

            {/* Copy / Share Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCopyCode}
                className="h-12 rounded-xl bg-[#121814] text-[#F5F7F2] border border-[#1F2922] hover:border-[#C8FF3D]/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#C8FF3D]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Room Code'}</span>
              </button>

              <button
                onClick={handleCopyInviteLink}
                className="h-12 rounded-xl bg-[#121814] text-[#F5F7F2] border border-[#1F2922] hover:border-[#C8FF3D]/40 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#C8FF3D]" /> : <ExternalLink className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onTableCreated(createdTable)}
                className="w-full h-12 rounded-xl bg-[#C8FF3D] text-[#050505] font-bold text-sm hover:bg-[#bbf330] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(200,255,61,0.22)] cursor-pointer"
              >
                <span>Enter Table Lobby</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
