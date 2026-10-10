import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, ExternalLink, Calendar, Users, ShieldAlert, ArrowLeft, Trash2 } from 'lucide-react';
import { RouletteRound } from '../types';
import { tableService } from '../services/tableService';
import { formatCents } from '../utils/currency';
import { solanaTransactionService } from '../services/solanaTransactionService';

interface HistoryPageProps {
  onBackToHome: () => void;
  onSelectRound?: (round: RouletteRound) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  onBackToHome,
  onSelectRound,
}) => {
  const [rounds, setRounds] = useState<RouletteRound[]>([]);

  useEffect(() => {
    let mounted = true;
    const fetchRounds = () => {
      tableService.getRounds().then((res) => {
        if (mounted) setRounds(res);
      });
    };
    fetchRounds();
    const unsubscribe = tableService.subscribeToUpdates(fetchRounds);
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const handleClearHistory = async () => {
    if (confirm('Clear previous dining rounds history?')) {
      localStorage.removeItem('bill_roulette_rounds_v2');
      setRounds([]);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {rounds.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Roulette Round History
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Archived restaurant bill spins, selected payers, and cryptographic verification statuses.
        </p>
      </div>

      {rounds.length === 0 ? (
        <div className="p-10 rounded-2xl bg-zinc-900/40 border border-zinc-800 text-center space-y-3">
          <HistoryIcon className="w-10 h-10 text-zinc-600 mx-auto" />
          <h2 className="font-semibold text-white text-base">No Recorded Spins Yet</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            Once a table completes a roulette spin, the outcome and VRF cryptographic record will be preserved here.
          </p>
          <div className="pt-2">
            <button
              onClick={onBackToHome}
              className="px-4 py-2 rounded-xl bg-[#ccff00] text-black font-semibold text-xs hover:bg-[#b8e600] cursor-pointer"
            >
              Start First Table
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rounds.map((round) => {
            const timestamp = round.preparedAt || round.createdAt || Date.now();
            const dateStr = new Date(timestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });
            const billCents = round.frozenBillCents || round.totalBillCents || 0;
            const dinersCount = (round.frozenParticipants || round.participants || []).length;
            const roundKey = round.roundId || round.id || `rnd_${Math.random()}`;

            return (
              <div
                key={roundKey}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3 hover:border-zinc-700 transition-colors"
              >
                {/* Header row: Table name, date, dev badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-white">
                      {round.tableName}
                    </span>
                    <span className="font-mono text-xs text-zinc-500">
                      ({round.roomCode})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {round.isDevelopmentOnly ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-amber-400/90">
                        Dev Sandbox Record
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        Solana Devnet
                      </span>
                    )}
                    <span className="text-zinc-500 text-[11px]">{dateStr}</span>
                  </div>
                </div>

                {/* Main outcome summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-black/60 border border-zinc-800/80 text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-semibold">
                      Chosen Payer
                    </span>
                    <div className="font-semibold text-white text-sm mt-0.5">
                      {round.selectedParticipantName || 'Pending'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-semibold">
                      Total Bill Settled
                    </span>
                    <div className="font-mono font-bold text-white text-sm mt-0.5 tabular-nums">
                      {formatCents(billCents, round.currency)}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-zinc-500 font-semibold">
                      Participants
                    </span>
                    <div className="text-zinc-300 font-medium text-sm mt-0.5">
                      {dinersCount} Diners
                    </div>
                  </div>
                </div>

                {/* Cryptographic verification / signature footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-zinc-400 pt-1">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-500 truncate max-w-md">
                    <span>VRF Seed:</span>
                    <span className="truncate">0x{round.randomnessSeedHex}</span>
                  </div>

                  {round.transactionSignature ? (
                    <a
                      href={solanaTransactionService.getExplorerUrl(round.transactionSignature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#ccff00] hover:underline font-mono text-[11px] shrink-0"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-zinc-500 font-mono shrink-0">
                      On-Chain Deployment Pending
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
