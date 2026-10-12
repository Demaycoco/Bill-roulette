import React from 'react';
import { ArrowRight, Users, ShieldCheck, Dices, UtensilsCrossed } from 'lucide-react';
import { NetworkBadge } from '../components/NetworkBadge';
import { BrandLogo } from '../components/BrandLogo';
import { sound } from '../utils/audio';

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
      <div className="mb-6 flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#0B0F0D] border border-[#1C251F] text-xs">
        <NetworkBadge />
        <span aria-hidden="true" className="text-[#2C3830]">·</span>
        <span className="text-[#8D958C] font-mono text-[11px]">MagicBlock VRF Live</span>
      </div>

      {/* Hero Section */}
      <div className="text-center space-y-4 max-w-2xl">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider uppercase text-[#C8FF3D]">
          <UtensilsCrossed className="w-3.5 h-3.5" />
          High Stakes Dining · Solana Social Settlement
        </div>

        <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-[#F5F7F2] text-balance leading-[1.08]">
          Good friends. Great food. <br />
          <span className="text-[#C8FF3D]">One unlucky wallet.</span>
        </h1>

        <p className="text-base sm:text-lg text-[#8D958C] text-balance max-w-lg mx-auto leading-relaxed">
          Split the thrill, not the check. Gather your table, tally the courses, and let verifiable on-chain randomness choose who foots the entire bill.
        </p>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mx-auto">
          <button
            onClick={() => {
              sound.playClick();
              onStartTable();
            }}
            className="w-full sm:w-auto flex-1 min-h-[50px] px-6 py-3.5 rounded-xl bg-[#C8FF3D] text-[#050505] font-bold text-sm hover:bg-[#bbf330] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(200,255,61,0.25)] cursor-pointer"
          >
            <span>Start a Table</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              sound.playClick();
              onJoinTable();
            }}
            className="w-full sm:w-auto flex-1 min-h-[50px] px-6 py-3.5 rounded-xl bg-[#0B0F0D] text-[#F5F7F2] border border-[#1F2922] hover:bg-[#121814] hover:border-[#C8FF3D]/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 font-semibold text-sm cursor-pointer"
          >
            <Users className="w-4 h-4 text-[#8D958C]" />
            <span>Join a Table</span>
          </button>
        </div>
      </div>

      {/* Hero Illustration / Interactive Teaser */}
      <div className="mt-10 sm:mt-12 w-full max-w-md relative flex flex-col items-center">
        <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-[#1F2922] bg-gradient-to-b from-[#121814] to-[#070A08] p-3 shadow-2xl flex items-center justify-center">
          {/* Subtle spinning dashed ring */}
          <div className="absolute inset-2 rounded-full border border-dashed border-[#C8FF3D]/20 animate-[spin_28s_linear_infinite]" />
          
          {/* Inner circle */}
          <div className="w-48 h-48 sm:w-52 sm:h-52 rounded-full bg-[#0B0F0D] border border-[#1C251F] flex flex-col items-center justify-center text-center p-4 relative z-10 shadow-inner">
            <div className="mb-2">
              <BrandLogo size={36} />
            </div>
            <span className="font-display font-bold text-white text-base">Who Pays?</span>
            <span className="text-[#8D958C] text-xs mt-0.5">Spin to determine</span>
            <span className="mt-2 font-mono text-[11px] text-[#C8FF3D] bg-[#121814] px-2.5 py-0.5 rounded-md border border-[#1F2922]">
              Solana Devnet
            </span>
          </div>

          {/* Orbiting participant indicator chips */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#0E1410] border border-[#1F2922] text-[11px] font-medium text-[#F5F7F2] shadow-sm">
            Alex $42
          </div>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-[#0E1410] border border-[#1F2922] text-[11px] font-medium text-[#F5F7F2] shadow-sm">
            Sarah $58
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-full bg-[#0E1410] border border-[#1F2922] text-[11px] font-medium text-[#F5F7F2] shadow-sm">
            Jordan $35
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-[#0E1410] border border-[#1F2922] text-[11px] font-medium text-[#F5F7F2] shadow-sm">
            Elena $49
          </div>
        </div>

        {/* Verifiable Randomness Banner */}
        <div className="mt-8 w-full rounded-2xl bg-[#0B0F0D] border border-[#1C251F] p-4 text-xs text-[#8D958C] flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#C8FF3D] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-[#F5F7F2]">Verifiable On-Chain Randomness</div>
            <p className="leading-relaxed">
              Winner selection is powered by MagicBlock Verifiable Random Function (VRF). The cryptographic proof beacon is mathematically tamper-proof and verified directly on Solana.
            </p>
          </div>
        </div>
      </div>

      {/* 3 Editorial Steps */}
      <div className="mt-14 w-full grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] hover:border-[#1F2922] space-y-2 transition-colors">
          <div className="font-mono text-xs font-semibold text-[#C8FF3D]">01. Open Table</div>
          <h3 className="font-semibold text-white text-sm">Gather Your Crew</h3>
          <p className="text-xs text-[#8D958C] leading-relaxed">
            The host creates a table and shares a 6-character room code with dinner companions.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] hover:border-[#1F2922] space-y-2 transition-colors">
          <div className="font-mono text-xs font-semibold text-[#C8FF3D]">02. Tally Orders</div>
          <h3 className="font-semibold text-white text-sm">Log What Was Eaten</h3>
          <p className="text-xs text-[#8D958C] leading-relaxed">
            Enter individual plates or the shared subtotal with exact integer-cent precision.
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] hover:border-[#1F2922] space-y-2 transition-colors">
          <div className="font-mono text-xs font-semibold text-[#C8FF3D]">03. Spin The Bill</div>
          <h3 className="font-semibold text-white text-sm">One Payer Takes All</h3>
          <p className="text-xs text-[#8D958C] leading-relaxed">
            The roulette wheel spins to the VRF-committed target. The selected diner settles the bill!
          </p>
        </div>
      </div>

      {/* Past Rounds Link */}
      <div className="mt-8 text-center">
        <button
          onClick={onViewHistory}
          className="text-xs text-[#8D958C] hover:text-[#F5F7F2] transition-colors inline-flex items-center gap-1 cursor-pointer py-2"
        >
          <span>View past dining rounds</span>
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
};
