import React, { useState } from 'react';
import { ArrowLeft, Copy, Check, Users, Receipt, Sparkles, ExternalLink } from 'lucide-react';
import { Currency, GameMode, Table } from '../types';
import { tableService } from '../services/tableService';
import { parseToCents, formatCents } from '../utils/currency';

interface CreateTablePageProps {
  hostWalletAddress?: string;
  onBack: () => void;
  onTableCreated: (table: Table) => void;
}

export const CreateTablePage: React.FC<CreateTablePageProps> = ({
  hostWalletAddress,
  onBack,
  onTableCreated,
}) => {
  const [tableName, setTableName] = useState('');
  const [hostName, setHostName] = useState('');
  const [currency, setCurrency] = useState<Currency>('USD');
  const [gameMode, setGameMode] = useState<GameMode>('individual');
  const [initialOrderStr, setInitialOrderStr] = useState('');
  const [sharedBillStr, setSharedBillStr] = useState('');

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
      const hostOrderCents = gameMode === 'individual' ? parseToCents(initialOrderStr) : 0;
      const sharedTotalCents = gameMode === 'shared' ? parseToCents(sharedBillStr) : 0;

      const table = await tableService.createTable({
        name: tableName,
        hostName,
        currency,
        gameMode,
        hostWallet: hostWalletAddress,
        initialHostOrderCents: hostOrderCents,
        sharedBillCents: sharedTotalCents,
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
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      {!createdTable ? (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Start a Table
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Create a dining table and invite friends to log their orders before the spin.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {error}
              </div>
            )}

            {/* Table Name */}
            <div className="space-y-1.5">
              <label htmlFor="tableName" className="block text-xs font-semibold text-zinc-300">
                Table Name
              </label>
              <input
                id="tableName"
                type="text"
                placeholder="e.g. Nobu Tasting Menu, Taco Tuesday"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
                maxLength={45}
              />
            </div>

            {/* Host Name */}
            <div className="space-y-1.5">
              <label htmlFor="hostName" className="block text-xs font-semibold text-zinc-300">
                Your Name (Table Host)
              </label>
              <input
                id="hostName"
                type="text"
                placeholder="e.g. Jordan K."
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
                maxLength={30}
              />
            </div>

            {/* Currency Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">Currency</label>
              <div className="grid grid-cols-4 gap-2">
                {(['USD', 'EUR', 'GBP', 'SOL'] as Currency[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`h-10 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      currency === c
                        ? 'bg-zinc-100 text-black border border-white shadow-sm'
                        : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Game Mode */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">Game Mode</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGameMode('individual')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                    gameMode === 'individual'
                      ? 'bg-zinc-800/80 border-[#ccff00] text-white ring-1 ring-[#ccff00]/50'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="w-4 h-4 text-[#ccff00]" />
                    <span className="text-xs font-bold text-white">Individual Orders</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Each participant enters their own items/amount. The wheel tallies the sum.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setGameMode('shared')}
                  className={`p-3.5 rounded-xl text-left border transition-all cursor-pointer ${
                    gameMode === 'shared'
                      ? 'bg-zinc-800/80 border-[#ccff00] text-white ring-1 ring-[#ccff00]/50'
                      : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Receipt className="w-4 h-4 text-[#ccff00]" />
                    <span className="text-xs font-bold text-white">Shared Bill</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Enter one total bill directly from the restaurant receipt.
                  </p>
                </button>
              </div>
            </div>

            {/* Mode-specific initial amount field */}
            {gameMode === 'individual' ? (
              <div className="space-y-1.5">
                <label htmlFor="initialOrder" className="block text-xs font-semibold text-zinc-300">
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
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    {currency}
                  </div>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Calculated in integer minor units ({currency} cents). You can adjust this later in the lobby.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label htmlFor="sharedBill" className="block text-xs font-semibold text-zinc-300">
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
                    className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500">
                    {currency}
                  </div>
                </div>
              </div>
            )}

            {/* Blockchain Storage Disclosure */}
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-300">Architecture Note:</span> Table draft state is managed in low-latency ephemeral storage. The final settlement and VRF randomness result are recorded and verified on Solana Devnet when the spin executes.
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#ccff00] text-black font-semibold text-sm hover:bg-[#b8e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] cursor-pointer"
            >
              <span>Create Table</span>
            </button>
          </form>
        </div>
      ) : (
        /* Post-Creation Success View */
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/30 mx-auto flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#ccff00]" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Table Created!
              </h2>
              <p className="text-xs text-zinc-400">
                Share this room code with everyone sitting at <span className="text-zinc-200 font-semibold">{createdTable.name}</span>.
              </p>
            </div>

            {/* Large Room Code Display */}
            <div className="p-4 rounded-xl bg-black border border-zinc-700/80 flex flex-col items-center justify-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                Room Code
              </span>
              <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-widest text-[#ccff00]">
                {createdTable.roomCode}
              </span>
            </div>

            {/* Copy / Share Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleCopyCode}
                className="h-11 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-[#ccff00]" /> : <Copy className="w-4 h-4" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Room Code'}</span>
              </button>

              <button
                onClick={handleCopyInviteLink}
                className="h-11 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-[#ccff00]" /> : <ExternalLink className="w-4 h-4" />}
                <span>{copiedLink ? 'Link Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onTableCreated(createdTable)}
                className="w-full h-12 rounded-xl bg-[#ccff00] text-black font-semibold text-sm hover:bg-[#b8e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
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
