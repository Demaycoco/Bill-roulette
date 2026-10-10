import React from 'react';
import { WalletState } from '../types';
import { NetworkBadge } from './NetworkBadge';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  walletState: WalletState;
  hasActiveTable: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  walletState,
  hasActiveTable,
}) => {
  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-[#0d0e12]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Wordmark */}
        <button
          onClick={() => onNavigate('landing')}
          className="group flex items-center gap-2 text-left shrink-0 transition-opacity hover:opacity-90 cursor-pointer"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] shadow-[0_0_10px_#ccff00]" />
          <span className="font-display font-extrabold text-lg sm:text-xl tracking-tight text-white">
            Bill Roulette
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-zinc-400">
          <button
            onClick={() => onNavigate('landing')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              currentView === 'landing' ? 'text-white' : ''
            }`}
          >
            Home
          </button>
          {hasActiveTable && (
            <button
              onClick={() => onNavigate('lobby')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                currentView === 'lobby' ? 'text-white' : ''
              }`}
            >
              Table Lobby
            </button>
          )}
          {hasActiveTable && (
            <button
              onClick={() => onNavigate('roulette')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                currentView === 'roulette' ? 'text-white' : ''
              }`}
            >
              Roulette Wheel
            </button>
          )}
          <button
            onClick={() => onNavigate('history')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
              currentView === 'history' ? 'text-white' : ''
            }`}
          >
            History
          </button>
        </nav>

        {/* Zone 3: Primary Action (Network & Wallet) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:block">
            <NetworkBadge />
          </div>

          <button
            onClick={() => onNavigate('wallet')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              walletState.connected
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-zinc-500'
                : 'bg-[#ccff00] text-black hover:bg-[#b8e600] active:scale-95 shadow-[0_0_15px_rgba(204,255,0,0.2)]'
            }`}
          >
            {walletState.connected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ccff00]" />
                <span className="font-mono">{formatAddress(walletState.publicKey || '')}</span>
              </>
            ) : (
              <span>Connect Wallet</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
