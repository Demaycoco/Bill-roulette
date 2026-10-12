import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Loader2, ArrowRight } from 'lucide-react';
import { Table, Participant, Currency } from '../types';
import { participantService } from '../services/participantService';
import { tableService, getCurrentUserId } from '../services/tableService';
import { parseToBaseUnits } from '../utils/currency';
import { CurrencyConverter } from '../components/CurrencyConverter';

interface JoinTablePageProps {
  userWalletAddress?: string;
  initialRoomCode?: string;
  onBack: () => void;
  onJoined: (table: Table, participant: Participant) => void;
  initialPrefilledAmount?: { amount: string; currency: Currency } | null;
}

export const JoinTablePage: React.FC<JoinTablePageProps> = ({
  userWalletAddress,
  initialRoomCode = '',
  onBack,
  onJoined,
  initialPrefilledAmount,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [name, setName] = useState('');
  const [orderAmountStr, setOrderAmountStr] = useState(initialPrefilledAmount?.amount || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);

  React.useEffect(() => {
    if (initialPrefilledAmount) {
      setOrderAmountStr(initialPrefilledAmount.amount);
    }
  }, [initialPrefilledAmount]);

  const currentUserId = getCurrentUserId();

  useEffect(() => {
    let mounted = true;
    tableService.getAllTables().then((tables) => {
      if (mounted) {
        setAvailableTables(tables.filter((t) => t.status === 'OPEN'));
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedTable = availableTables.find(
    (t) => t.roomCode.toUpperCase() === roomCode.trim().toUpperCase()
  );
  const activeCurrency = selectedTable?.currency ?? 'SOL';

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = roomCode.trim().toUpperCase();
    const cleanName = name.trim();

    if (!cleanCode) {
      setErrorMessage('Please enter the 6-character room code.');
      return;
    }
    if (!cleanName) {
      setErrorMessage('Please enter your name.');
      return;
    }

    setIsLoading(true);

    try {
      let tableCurrency = activeCurrency;
      const targetTable = await tableService.getTableByRoomCode(cleanCode);
      if (targetTable) {
        tableCurrency = targetTable.currency;
      }

      const orderBaseUnits = Number(parseToBaseUnits(orderAmountStr, tableCurrency));
      const result = await participantService.joinTable({
        roomCode: cleanCode,
        name: cleanName,
        orderAmountCents: orderBaseUnits,
        walletAddress: userWalletAddress,
      });

      setIsLoading(false);

      if (!result.success || !result.table || !result.participant) {
        setErrorMessage(result.error || 'Failed to join table.');
        return;
      }

      onJoined(result.table, result.participant);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join table.');
    }
  };

  const handleQuickSelectTable = (tbl: Table) => {
    setRoomCode(tbl.roomCode);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-[#8D958C] hover:text-[#F5F7F2] transition-colors mb-6 cursor-pointer py-1"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F7F2]">
            Join a Table
          </h1>
          <p className="text-sm text-[#8D958C] mt-1">
            Enter the host's room code to add yourself to the bill roulette.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#FF5A5F]/10 border border-[#FF5A5F]/30 text-[#FF5A5F] text-xs">
              {errorMessage}
            </div>
          )}

          {/* Room Code */}
          <div className="space-y-1.5">
            <label htmlFor="roomCode" className="block text-xs font-semibold text-[#F5F7F2]">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              placeholder="e.g. NOB882"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-[#F5F7F2] placeholder-[#525A51] font-mono text-base tracking-widest uppercase focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
              maxLength={8}
              disabled={isLoading}
            />
          </div>

          {/* Participant Name */}
          <div className="space-y-1.5">
            <label htmlFor="participantName" className="block text-xs font-semibold text-[#F5F7F2]">
              Your Name
            </label>
            <input
              id="participantName"
              type="text"
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-[#F5F7F2] placeholder-[#525A51] text-sm focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
              maxLength={30}
              disabled={isLoading}
            />
          </div>

          {/* Currency Converter for What You Bought (Real Live Rates) */}
          <CurrencyConverter
            variant="card"
            initialCurrencyCode="NGN"
            initialAmount="5000"
            targetCurrency={activeCurrency}
            title="Currency Converter (What You Bought)"
            subtitle={`Convert what you ordered in your local currency into ${activeCurrency} to join this table.`}
            onApplyAmount={(amountDecimal) => {
              setOrderAmountStr(amountDecimal);
            }}
          />

          {/* Order Amount */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="orderAmount" className="block text-xs font-semibold text-[#F5F7F2]">
                Your Order Amount (Optional)
              </label>
              <span className="text-[10px] font-mono font-bold text-[#C8FF3D] bg-[#121814] px-2 py-0.5 rounded border border-[#1F2922]">
                {activeCurrency}
              </span>
            </div>
            <div className="relative">
              <input
                id="orderAmount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={orderAmountStr}
                onChange={(e) => setOrderAmountStr(e.target.value)}
                className="w-full h-12 px-3.5 rounded-xl bg-[#0B0F0D] border border-[#1F2922] text-[#F5F7F2] placeholder-[#525A51] text-sm font-mono focus:outline-none focus:border-[#C8FF3D] focus:ring-1 focus:ring-[#C8FF3D] transition-colors"
                disabled={isLoading}
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-semibold text-[#8D958C]">
                {activeCurrency}
              </div>
            </div>
            <p className="text-[11px] text-[#8D958C]">
              Stored as integer base units ({activeCurrency === 'SOL' ? 'lamports' : 'micro-USDC'}). Exact precision preserved.
            </p>
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isLoading
                ? 'bg-[#121814] text-[#8D958C] cursor-not-allowed'
                : 'bg-[#C8FF3D] text-[#050505] hover:bg-[#bbf330] active:scale-[0.98] shadow-[0_0_20px_rgba(200,255,61,0.22)]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#C8FF3D]" />
                <span>Checking Table...</span>
              </>
            ) : (
              <>
                <span>Join Table</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Join Active Tables */}
        {availableTables.length > 0 && (
          <div className="pt-6 border-t border-[#1C251F] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#8D958C] font-semibold">
              <span>Open Tables</span>
              <span>{availableTables.length} Active</span>
            </div>

            <div className="space-y-2">
              {availableTables.map((t) => {
                const isUserAlreadyIn = t.participants.some((p) => p.id === currentUserId);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleQuickSelectTable(t)}
                    type="button"
                    className="w-full p-3.5 rounded-2xl bg-[#0B0F0D] border border-[#1F2922] hover:border-[#C8FF3D]/40 flex items-center justify-between text-left transition-all cursor-pointer group"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-[#F5F7F2] flex items-center gap-2 group-hover:text-white">
                        <span>{t.name}</span>
                        {isUserAlreadyIn && (
                          <span className="text-[10px] text-[#C8FF3D] font-mono">
                            Joined
                          </span>
                        )}
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#121814] text-[#C8FF3D] border border-[#1F2922]">
                          {t.currency}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#8D958C] flex items-center gap-2">
                        <span>Host: {t.hostName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.participants.length} seated</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-[#C8FF3D] bg-[#121814] px-2.5 py-1 rounded-lg border border-[#1F2922]">
                        {t.roomCode}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
