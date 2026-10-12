import React, { useEffect, useState } from 'react';
import {
  PartyPopper,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  CreditCard,
} from 'lucide-react';
import { RouletteRound } from '../types';
import { ConfettiEffect } from '../components/ConfettiEffect';
import { formatCents } from '../utils/currency';
import { transactionVerificationService, VerificationResult } from '../services/transactionVerificationService';

interface ResultPageProps {
  round: RouletteRound;
  onReturnToTable: () => void;
  onViewHistory: () => void;
}

const HUMOROUS_QUOTES = [
  "The food was divine, the drinks were top-shelf, and your sacrifice is eternal.",
  "May your credit card offer 4x points on dining tonight.",
  "Your friends will gladly toast to your unmatched generosity!",
  "A moment of silence for this wallet, but a night of glory for your reputation.",
  "Pro tip: Always check if the restaurant takes Apple Pay before you panic.",
];

export const ResultPage: React.FC<ResultPageProps> = ({
  round,
  onReturnToTable,
  onViewHistory,
}) => {
  const [verification, setVerification] = useState<VerificationResult | null>(null);
  const [quoteIndex] = useState(() => Math.floor(Math.random() * HUMOROUS_QUOTES.length));

  useEffect(() => {
    let mounted = true;
    transactionVerificationService.evaluateRoundVerification(round).then((res) => {
      if (mounted) setVerification(res);
    });
    return () => {
      mounted = false;
    };
  }, [round]);

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Trigger celebratory confetti */}
      <ConfettiEffect />

      {/* Dramatic Winner Announcement Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#0B0F0D] via-[#0B0F0D] to-[#050505] border-2 border-[#C8FF3D]/60 shadow-[0_0_36px_rgba(200,255,61,0.18)] text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-[#C8FF3D]/15 border border-[#C8FF3D]/40 mx-auto flex items-center justify-center">
          <CreditCard className="w-7 h-7 text-[#C8FF3D]" />
        </div>

        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-[#C8FF3D]">
            <Sparkles className="w-3.5 h-3.5" />
            The Chosen Payer
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#F5F7F2] tracking-tight">
            {round.selectedParticipantName}
          </h1>
        </div>

        {/* Bill Total Display */}
        <div className="p-4 rounded-2xl bg-[#050505] border border-[#1C251F] space-y-1">
          <span className="text-[11px] uppercase tracking-wider text-[#8D958C] font-semibold">
            Total Tab To Settle
          </span>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#C8FF3D] tabular-nums">
            {formatCents(round.frozenBillCents || round.totalBillCents || 0, round.currency)}
          </div>
          <span className="text-xs text-[#8D958C]">
            For {(round.frozenParticipants || round.participants || []).length} seated diners at {round.tableName}
          </span>
        </div>

        {/* Friendly Humorous Quote */}
        <p className="text-xs sm:text-sm text-[#8D958C] italic px-2">
          &ldquo;{HUMOROUS_QUOTES[quoteIndex]}&rdquo;
        </p>
      </div>

      {/* Verification Status Card - Strictly Honest */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#F5F7F2]">Randomness Verification</span>
          {verification ? (
            <span
              className={`font-mono text-[11px] px-2.5 py-0.5 rounded border ${
                verification.badgeVariant === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : verification.badgeVariant === 'pending'
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                  : 'bg-[#121814] text-[#8D958C] border-[#1F2922]'
              }`}
            >
              {verification.displayBadge}
            </span>
          ) : (
            <span className="text-[#8D958C]">Evaluating...</span>
          )}
        </div>

        {verification && (
          <p className="text-xs text-[#8D958C] leading-relaxed">
            {verification.details}
          </p>
        )}

        {/* Cryptographic Seed & VRF Beacon Metadata */}
        <div className="pt-2 border-t border-[#1C251F] space-y-2 text-left">
          {round.vrfRequestId && (
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#8D958C]">
                MagicBlock VRF Request ID
              </span>
              <div className="p-2 rounded bg-[#050505] border border-[#1F2922] font-mono text-[10px] text-[#F5F7F2] select-all">
                {round.vrfRequestId}
              </div>
            </div>
          )}

          <div>
            <span className="text-[10px] uppercase font-semibold text-[#8D958C]">
              Verified 256-bit Randomness Beacon
            </span>
            <div className="p-2 rounded bg-[#050505] border border-[#1F2922] font-mono text-[10px] text-[#C8FF3D] break-all select-all">
              0x{round.vrfBeaconHex || round.randomnessSeedHex}
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-[#525A51] pt-1">
            <span>Authoritative Modulo Index: {round.selectedParticipantIndex ?? '0'}</span>
            <span>VRF: MagicBlock Labs</span>
          </div>
        </div>

        {/* On-Chain Transaction Explorer Link (Only when actually available) */}
        {verification?.explorerUrl && (
          <div className="pt-2">
            <a
              href={verification.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[#C8FF3D] hover:underline font-mono"
            >
              <span>View On Solana Explorer</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          onClick={onReturnToTable}
          className="w-full sm:flex-1 h-12 rounded-xl bg-[#C8FF3D] text-[#050505] font-semibold text-xs tracking-wide uppercase hover:bg-[#bbf330] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_16px_rgba(200,255,61,0.2)]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Return to Table</span>
        </button>

        <button
          onClick={onViewHistory}
          className="w-full sm:flex-1 h-12 rounded-xl bg-[#0B0F0D] text-[#F5F7F2] border border-[#1C251F] hover:bg-[#121814] hover:border-[#2C3830] font-semibold text-xs tracking-wide uppercase transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>View Past Rounds</span>
        </button>
      </div>
    </div>
  );
};
