import React from 'react';
import { Home, Users, Disc, History as HistoryIcon, Wallet as WalletIcon } from 'lucide-react';
import { sound } from '../utils/audio';

interface BottomTabBarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  hasActiveTable: boolean;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentView,
  onNavigate,
  hasActiveTable,
}) => {
  const handleNav = (view: string) => {
    sound.playClick();
    onNavigate(view);
  };

  const isHomeActive = currentView === 'landing';
  const isTableActive = currentView === 'lobby' || currentView === 'create-table' || currentView === 'join-table';
  const isWheelActive = currentView === 'roulette' || currentView === 'result';
  const isHistoryActive = currentView === 'history';
  const isWalletActive = currentView === 'wallet';

  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F0D]/95 backdrop-blur-xl border-t border-[#1C251F] px-3 py-1 pb-safe"
    >
      <div className="grid grid-cols-5 items-center h-15 max-w-md mx-auto">
        {/* Home */}
        <button
          onClick={() => handleNav('landing')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer relative ${
            isHomeActive ? 'text-[#C8FF3D]' : 'text-[#8D958C] hover:text-[#F5F7F2]'
          }`}
        >
          <Home className="w-5 h-5 transition-transform active:scale-90" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Home</span>
          {isHomeActive && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
          )}
        </button>

        {/* Table / Lobby */}
        <button
          onClick={() => handleNav(hasActiveTable ? 'lobby' : 'create-table')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer relative ${
            isTableActive ? 'text-[#C8FF3D]' : 'text-[#8D958C] hover:text-[#F5F7F2]'
          }`}
        >
          <Users className="w-5 h-5 transition-transform active:scale-90" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">
            {hasActiveTable ? 'Lobby' : 'Table'}
          </span>
          {isTableActive && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
          )}
        </button>

        {/* Roulette Wheel */}
        <button
          onClick={() => handleNav('roulette')}
          disabled={!hasActiveTable}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer relative ${
            !hasActiveTable
              ? 'opacity-30 cursor-not-allowed text-[#525A51]'
              : isWheelActive
              ? 'text-[#C8FF3D]'
              : 'text-[#8D958C] hover:text-[#F5F7F2]'
          }`}
        >
          <div className="relative">
            <Disc className="w-5 h-5 transition-transform active:scale-90" />
            {hasActiveTable && !isWheelActive && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#C8FF3D] rounded-full" />
            )}
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-1">Wheel</span>
          {isWheelActive && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
          )}
        </button>

        {/* History */}
        <button
          onClick={() => handleNav('history')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer relative ${
            isHistoryActive ? 'text-[#C8FF3D]' : 'text-[#8D958C] hover:text-[#F5F7F2]'
          }`}
        >
          <HistoryIcon className="w-5 h-5 transition-transform active:scale-90" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">History</span>
          {isHistoryActive && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
          )}
        </button>

        {/* Wallet */}
        <button
          onClick={() => handleNav('wallet')}
          className={`flex flex-col items-center justify-center h-full min-h-[48px] min-w-[48px] rounded-xl transition-all cursor-pointer relative ${
            isWalletActive ? 'text-[#C8FF3D]' : 'text-[#8D958C] hover:text-[#F5F7F2]'
          }`}
        >
          <WalletIcon className="w-5 h-5 transition-transform active:scale-90" />
          <span className="text-[10px] font-semibold tracking-tight mt-1">Wallet</span>
          {isWalletActive && (
            <span className="absolute bottom-1 w-1 h-1 rounded-full bg-[#C8FF3D] shadow-[0_0_6px_#C8FF3D]" />
          )}
        </button>
      </div>
    </nav>
  );
};

