import React, { useState, useEffect } from 'react';
import { ArrowLeft, Users, Loader2, ArrowRight } from 'lucide-react';
import { Table, Participant } from '../types';
import { participantService } from '../services/participantService';
import { tableService, getCurrentUserId } from '../services/tableService';
import { parseToCents } from '../utils/currency';

interface JoinTablePageProps {
  userWalletAddress?: string;
  initialRoomCode?: string;
  onBack: () => void;
  onJoined: (table: Table, participant: Participant) => void;
}

export const JoinTablePage: React.FC<JoinTablePageProps> = ({
  userWalletAddress,
  initialRoomCode = '',
  onBack,
  onJoined,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [name, setName] = useState('');
  const [orderAmountStr, setOrderAmountStr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);

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
      const orderCents = parseToCents(orderAmountStr);
      const result = await participantService.joinTable({
        roomCode: cleanCode,
        name: cleanName,
        orderAmountCents: orderCents,
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
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors mb-6 cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Join a Table
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Enter the host's room code to add yourself to the bill roulette.
          </p>
        </div>

        <form onSubmit={handleJoin} className="space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          {/* Room Code */}
          <div className="space-y-1.5">
            <label htmlFor="roomCode" className="block text-xs font-semibold text-zinc-300">
              Room Code
            </label>
            <input
              id="roomCode"
              type="text"
              placeholder="e.g. NOB882"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full h-12 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 font-mono text-base tracking-widest uppercase focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
              maxLength={8}
              disabled={isLoading}
            />
          </div>

          {/* Participant Name */}
          <div className="space-y-1.5">
            <label htmlFor="participantName" className="block text-xs font-semibold text-zinc-300">
              Your Name
            </label>
            <input
              id="participantName"
              type="text"
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
              maxLength={30}
              disabled={isLoading}
            />
          </div>

          {/* Order Amount */}
          <div className="space-y-1.5">
            <label htmlFor="orderAmount" className="block text-xs font-semibold text-zinc-300">
              Your Order Amount (Optional)
            </label>
            <input
              id="orderAmount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={orderAmountStr}
              onChange={(e) => setOrderAmountStr(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white placeholder-zinc-500 text-sm font-mono focus:outline-none focus:border-[#ccff00] focus:ring-1 focus:ring-[#ccff00] transition-colors"
              disabled={isLoading}
            />
            <p className="text-[11px] text-zinc-500">
              If the table is in individual orders mode, enter your share. You can update this in the lobby.
            </p>
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full h-12 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isLoading
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-[#ccff00] text-black hover:bg-[#b8e600] active:scale-[0.98] shadow-[0_0_20px_rgba(204,255,0,0.2)]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
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
          <div className="pt-6 border-t border-zinc-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400 font-semibold">
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
                    className="w-full p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 flex items-center justify-between text-left transition-colors cursor-pointer"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>{t.name}</span>
                        {isUserAlreadyIn && (
                          <span className="text-[10px] text-[#ccff00] font-mono">
                            Joined
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-2">
                        <span>Host: {t.hostName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.participants.length} seated</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-mono text-xs font-semibold text-zinc-300 bg-zinc-800 px-2 py-1 rounded">
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
