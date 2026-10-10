import React from 'react';
import { ArrowRight, Users, ShieldCheck, Dices, Sparkles, ChefHat } from 'lucide-react';
import { NetworkBadge } from '../components/NetworkBadge';

interface LandingPageProps {
  onStartTable: () => void;
  onJoinTable: () => void;
  onViewHistory: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartTable,
  onJoinTable,
  onViewHistory,
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 sm:px-6 py-6 sm:py-12 max-w-4xl mx-auto">
      {/* Devnet Status Bar */}
      <div className="mb-6 flex items-center gap-3 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-xs">
        <NetworkBadge />
        <span aria-hidden="true" className="text-zinc-700">·</span>
        <span className="text-zinc-400 font-mono text-[11px]">MagicBlock VRF Ready</span>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#ccff00]">
          <ChefHat className="w-3.5 h-3.5" />
          Multiplayer Dining Roulette
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white text-balance leading-[1.08]">
          Good friends. Great food. <br />
          <span className="text-[#ccff00]">One unlucky wallet.</span>
        </h1>

        <p className="text-base sm:text-lg text-zinc-400 text-balance max-w-lg mx-auto">
          Split the thrill, not the check. Join a shared restaurant table, tally the orders, and let verifiable randomness choose who foots the entire bill.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md mx-auto">
          <button
            onClick={onStartTable}
            className="w-full sm:w-auto flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-[#ccff00] text-black font-semibold text-sm hover:bg-[#b8e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.25)] cursor-pointer"
          >
            <span>Start a Table</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onJoinTable}
            className="w-full sm:w-auto flex-1 min-h-[48px] px-6 py-3 rounded-xl bg-zinc-900 text-zinc-200 border border-zinc-700/80 hover:bg-zinc-800 hover:border-zinc-500 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
          >
            <Users className="w-4 h-4 text-zinc-400" />
            <span>Join a Table</span>
          </button>
        </div>
      </div>

      {/* Hero Illustration / Interactive Teaser */}
      <div className="mt-10 sm:mt-12 w-full max-w-md relative flex flex-col items-center">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-zinc-800 bg-gradient-to-b from-zinc-900/80 to-[#0e1014] p-3 shadow-2xl flex items-center justify-center">
          {/* Subtle spinning dashed ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-zinc-700/60 animate-[spin_24s_linear_infinite]" />
          
          {/* Inner circle */}
          <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-zinc-950/90 border border-zinc-800 flex flex-col items-center justify-center text-center p-4 relative z-10 shadow-inner">
            <div className="w-10 h-10 rounded-full bg-[#ccff00]/10 border border-[#ccff00]/40 flex items-center justify-center mb-2">
              <Dices className="w-5 h-5 text-[#ccff00]" />
            </div>
            <span className="font-display font-bold text-white text-base">Who Pays?</span>
            <span className="text-zinc-500 text-xs mt-0.5">Spin to determine</span>
            <span className="mt-2 font-mono text-[11px] text-[#ccff00] bg-zinc-900/90 px-2 py-0.5 rounded border border-zinc-800">
              Solana Devnet
            </span>
          </div>

          {/* Orbiting participant indicator chips */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700 text-[11px] font-medium text-zinc-300">
            Alex $42
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700 text-[11px] font-medium text-zinc-300">
            Sarah $58
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700 text-[11px] font-medium text-zinc-300">
            Jordan $35
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-zinc-800/90 border border-zinc-700 text-[11px] font-medium text-zinc-300">
            Elena $49
          </div>
        </div>

        {/* Verifiable Randomness Banner */}
        <div className="mt-8 w-full rounded-xl bg-zinc-900/60 border border-zinc-800 p-4 text-xs text-zinc-400 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#ccff00] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-zinc-200">Verifiable On-Chain Randomness</div>
            <p className="leading-relaxed">
              Winner selection is powered by MagicBlock Verifiable Random Function (VRF). Unlike biased coin flips, the cryptographic proof is mathematically tamper-proof and verifiable on Solana.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Short Steps */}
      <div className="mt-14 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
          <div className="font-mono text-xs font-semibold text-[#ccff00]">01. Open Table</div>
          <h3 className="font-semibold text-white text-sm">Gather Your Crew</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The host creates a table and shares a 6-character room code with dinner companions.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
          <div className="font-mono text-xs font-semibold text-[#ccff00]">02. Tally Orders</div>
          <h3 className="font-semibold text-white text-sm">Log What Was Eaten</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Enter individual plates or the shared subtotal with exact integer-cent precision.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-2">
          <div className="font-mono text-xs font-semibold text-[#ccff00]">03. Spin The Bill</div>
          <h3 className="font-semibold text-white text-sm">One Payer Takes All</h3>
          <p className="text-xs text-zinc-400 leading-relaxed">
            The roulette wheel spins to the VRF-committed target. The loser covers the total!
          </p>
        </div>
      </div>

      {/* Past Rounds Link */}
      <div className="mt-8 text-center">
        <button
          onClick={onViewHistory}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          <span>View past dining rounds</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
