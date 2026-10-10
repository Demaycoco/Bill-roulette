import React from 'react';
import { Home, Users, Disc, History as HistoryIcon, Wallet as WalletIcon } from 'lucide-react';

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
  return (
    <nav
      aria-label="Mobile navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d0e12]/95 backdrop-blur-lg border-t border-zinc-800/80 px-2 py-1.5"
    >
      <div className="grid grid-cols-5 items-center h-13 max-w-md mx-auto">
        <button
          onClick={() => onNavigate('landing')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'landing' ? 'text-[#ccff00]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Home</span>
        </button>

        <button
          onClick={() => onNavigate(hasActiveTable ? 'lobby' : 'create-table')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'lobby' || currentView === 'create-table' || currentView === 'join-table'
              ? 'text-[#ccff00]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">
            {hasActiveTable ? 'Lobby' : 'Table'}
          </span>
        </button>

        <button
          onClick={() => onNavigate('roulette')}
          disabled={!hasActiveTable}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] rounded-lg transition-colors cursor-pointer ${
            !hasActiveTable
              ? 'opacity-30 cursor-not-allowed text-zinc-600'
              : currentView === 'roulette' || currentView === 'result'
              ? 'text-[#ccff00]'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <div className="relative">
            <Disc className="w-5 h-5" />
            {hasActiveTable && currentView !== 'roulette' && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-[#ccff00] rounded-full" />
            )}
          </div>
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Wheel</span>
        </button>

        <button
          onClick={() => onNavigate('history')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'history' ? 'text-[#ccff00]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <HistoryIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">History</span>
        </button>

        <button
          onClick={() => onNavigate('wallet')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] rounded-lg transition-colors cursor-pointer ${
            currentView === 'wallet' ? 'text-[#ccff00]' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <WalletIcon className="w-5 h-5" />
          <span className="text-[10px] font-medium tracking-tight mt-0.5">Wallet</span>
        </button>
      </div>
    </nav>
  );
};
