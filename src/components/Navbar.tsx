import React from 'react';
import { WalletState } from '../types';
import { NetworkBadge } from './NetworkBadge';
import { BrandLogo } from './BrandLogo';
import { sound } from '../utils/audio';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  walletState: WalletState;
  hasActiveTable: boolean;
  onOpenWalletModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  walletState,
  hasActiveTable,
  onOpenWalletModal,
}) => {
  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

  const handleNav = (view: string) => {
    sound.playClick();
    onNavigate(view);
  };

  const handleWalletClick = () => {
    sound.playClick();
    if (!walletState.connected && onOpenWalletModal) {
      onOpenWalletModal();
    } else {
      onNavigate('wallet');
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#1C251F] bg-[#0B0F0D]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Wordmark with Brand Logo */}
        <button
          onClick={() => handleNav('landing')}
          className="group flex items-center text-left shrink-0 transition-opacity hover:opacity-95 cursor-pointer focus:outline-none"
        >
          <BrandLogo size={28} showText={true} textClassName="text-base sm:text-lg" />
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#8D958C]">
          <button
            onClick={() => handleNav('landing')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer py-1 relative ${
              currentView === 'landing' ? 'text-white font-semibold' : ''
            }`}
          >
            Home
            {currentView === 'landing' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8FF3D] rounded-full" />
            )}
          </button>
          {hasActiveTable && (
            <button
              onClick={() => handleNav('lobby')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer py-1 relative ${
                currentView === 'lobby' ? 'text-white font-semibold' : ''
              }`}
            >
              Table Lobby
              {currentView === 'lobby' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8FF3D] rounded-full" />
              )}
            </button>
          )}
          {hasActiveTable && (
            <button
              onClick={() => handleNav('roulette')}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer py-1 relative ${
                currentView === 'roulette' ? 'text-white font-semibold' : ''
              }`}
            >
              Roulette Wheel
              {currentView === 'roulette' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8FF3D] rounded-full" />
              )}
            </button>
          )}
          <button
            onClick={() => handleNav('history')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer py-1 relative ${
              currentView === 'history' ? 'text-white font-semibold' : ''
            }`}
          >
            History
            {currentView === 'history' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C8FF3D] rounded-full" />
            )}
          </button>
        </nav>

        {/* Zone 3: Primary Action (Network & Wallet) */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="hidden sm:block">
            <NetworkBadge />
          </div>

          <button
            onClick={handleWalletClick}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-2 cursor-pointer ${
              walletState.connected
                ? 'bg-[#121814] text-[#F5F7F2] border border-[#1F2922] hover:border-[#C8FF3D]/40'
                : 'bg-[#C8FF3D] text-[#050505] hover:bg-[#bbf330] active:scale-95 shadow-[0_0_16px_rgba(200,255,61,0.25)]'
            }`}
          >
            {walletState.connected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8FF3D]" />
                <span className="font-mono text-xs">{formatAddress(walletState.publicKey || '')}</span>
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

