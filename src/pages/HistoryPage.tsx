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
          className="flex items-center gap-1.5 text-xs font-medium text-[#8D958C] hover:text-[#F5F7F2] transition-colors cursor-pointer py-1"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </button>

        {rounds.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1 text-xs text-[#8D958C] hover:text-[#FF5A5F] transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F5F7F2]">
          Roulette Round History
        </h1>
        <p className="text-sm text-[#8D958C] mt-1">
          Archived restaurant bill spins, selected payers, and cryptographic verification statuses.
        </p>
      </div>

      {rounds.length === 0 ? (
        <div className="p-10 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] text-center space-y-3 shadow-xl">
          <HistoryIcon className="w-10 h-10 text-[#525A51] mx-auto" />
          <h2 className="font-semibold text-[#F5F7F2] text-base">No Recorded Spins Yet</h2>
          <p className="text-xs text-[#8D958C] max-w-sm mx-auto">
            Once a table completes a roulette spin, the outcome and VRF cryptographic record will be preserved here.
          </p>
          <div className="pt-2">
            <button
              onClick={onBackToHome}
              className="px-4 py-2 rounded-xl bg-[#C8FF3D] text-[#050505] font-semibold text-xs hover:bg-[#bbf330] cursor-pointer shadow-[0_0_12px_rgba(200,255,61,0.2)]"
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
                className="p-4 sm:p-5 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] space-y-3 hover:border-[#2C3830] transition-colors shadow-lg"
              >
                {/* Header row: Table name, date, dev badge */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-base text-[#F5F7F2]">
                      {round.tableName}
                    </span>
                    <span className="font-mono text-xs text-[#8D958C]">
                      ({round.roomCode})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs">
                    {round.isDevelopmentOnly ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121814] border border-[#1F2922] text-amber-400/90">
                        Dev Sandbox Record
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                        Solana Devnet
                      </span>
                    )}
                    <span className="text-[#8D958C] text-[11px]">{dateStr}</span>
                  </div>
                </div>

                {/* Main outcome summary */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-[#050505] border border-[#1F2922] text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-[#8D958C] font-semibold">
                      Chosen Payer
                    </span>
                    <div className="font-semibold text-[#F5F7F2] text-sm mt-0.5">
                      {round.selectedParticipantName || 'Pending'}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-[#8D958C] font-semibold">
                      Total Bill Settled
                    </span>
                    <div className="font-mono font-bold text-[#C8FF3D] text-sm mt-0.5 tabular-nums">
                      {formatCents(billCents, round.currency)}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase text-[#8D958C] font-semibold">
                      Participants
                    </span>
                    <div className="text-[#8D958C] font-medium text-sm mt-0.5">
                      {dinersCount} Diners
                    </div>
                  </div>
                </div>

                {/* Cryptographic verification / signature footer */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#8D958C] pt-1">
                  <div className="flex items-center gap-2 font-mono text-[11px] text-[#525A51] truncate max-w-md">
                    <span>VRF Seed:</span>
                    <span className="truncate text-[#8D958C]">0x{round.randomnessSeedHex}</span>
                  </div>

                  {round.transactionSignature ? (
                    <a
                      href={solanaTransactionService.getExplorerUrl(round.transactionSignature)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[#C8FF3D] hover:underline font-mono text-[11px] shrink-0"
                    >
                      <span>Solana Explorer</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="text-[11px] text-[#525A51] font-mono shrink-0">
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
