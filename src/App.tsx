/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Table, RouletteRound, WalletState } from './types';
import { tableService } from './services/tableService';
import { walletService } from './services/walletService';

import { Navbar } from './components/Navbar';
import { BottomTabBar } from './components/BottomTabBar';

import { LandingPage } from './pages/LandingPage';
import { CreateTablePage } from './pages/CreateTablePage';
import { JoinTablePage } from './pages/JoinTablePage';
import { TableLobbyPage } from './pages/TableLobbyPage';
import { RoulettePage } from './pages/RoulettePage';
import { ResultPage } from './pages/ResultPage';
import { HistoryPage } from './pages/HistoryPage';
import { WalletPage } from './pages/WalletPage';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [activeTable, setActiveTable] = useState<Table | null>(null);
  const [activeRound, setActiveRound] = useState<RouletteRound | null>(null);
  const [initialJoinCode, setInitialJoinCode] = useState<string>('');
  const [walletState, setWalletState] = useState<WalletState>(walletService.getState());

  // Subscribe to wallet updates
  useEffect(() => {
    const unsub = walletService.subscribe((state) => {
      setWalletState(state);
    });
    return unsub;
  }, []);

  // Parse invite code from URL query parameter if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        setInitialJoinCode(code);
        setCurrentView('join-table');
      }
    }
  }, []);

  // Subscribe to updates via tableService
  useEffect(() => {
    const unsub = tableService.subscribeToUpdates(() => {
      if (activeTable) {
        tableService.getTable(activeTable.id).then((refreshed) => {
          if (refreshed) setActiveTable(refreshed);
        });
      }
    });
    return unsub;
  }, [activeTable]);

  // Load first available table on initial mount if none selected
  useEffect(() => {
    let mounted = true;
    if (!activeTable) {
      tableService.getAllTables().then((tables) => {
        if (mounted && tables.length > 0) {
          setActiveTable(tables[0]);
        }
      });
    }
    return () => {
      mounted = false;
    };
  }, [activeTable]);

  const handleTableCreated = (table: Table) => {
    setActiveTable(table);
    setCurrentView('lobby');
  };

  const handleTableJoined = (table: Table) => {
    setActiveTable(table);
    setCurrentView('lobby');
  };

  const handleSpinResolved = (round: RouletteRound) => {
    setActiveRound(round);
    setCurrentView('result');
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-[#f4f4f6] flex flex-col selection:bg-[#ccff00] selection:text-black">
      {/* 3-Zone Top Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        walletState={walletState}
        hasActiveTable={!!activeTable}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 pb-20 md:pb-10">
        {currentView === 'landing' && (
          <LandingPage
            onStartTable={() => setCurrentView('create-table')}
            onJoinTable={() => setCurrentView('join-table')}
            onViewHistory={() => setCurrentView('history')}
          />
        )}

        {currentView === 'create-table' && (
          <CreateTablePage
            hostWalletAddress={walletState.publicKey || undefined}
            onBack={() => setCurrentView(activeTable ? 'lobby' : 'landing')}
            onTableCreated={handleTableCreated}
          />
        )}

        {currentView === 'join-table' && (
          <JoinTablePage
            userWalletAddress={walletState.publicKey || undefined}
            initialRoomCode={initialJoinCode}
            onBack={() => setCurrentView(activeTable ? 'lobby' : 'landing')}
            onJoined={handleTableJoined}
          />
        )}

        {currentView === 'lobby' && activeTable && (
          <TableLobbyPage
            table={activeTable}
            walletState={walletState}
            onTableUpdated={(updated) => setActiveTable(updated)}
            onProceedToRoulette={() => setCurrentView('roulette')}
            onLeaveTable={() => {
              setActiveTable(null);
              setCurrentView('landing');
            }}
          />
        )}

        {currentView === 'roulette' && activeTable && (
          <RoulettePage
            table={activeTable}
            onBackToLobby={() => setCurrentView('lobby')}
            onSpinResolved={handleSpinResolved}
          />
        )}

        {currentView === 'result' && activeRound && (
          <ResultPage
            round={activeRound}
            onReturnToTable={() => setCurrentView('lobby')}
            onViewHistory={() => setCurrentView('history')}
          />
        )}

        {currentView === 'history' && (
          <HistoryPage
            onBackToHome={() => setCurrentView(activeTable ? 'lobby' : 'landing')}
            onSelectRound={(round) => {
              setActiveRound(round);
              setCurrentView('result');
            }}
          />
        )}

        {currentView === 'wallet' && (
          <WalletPage
            walletState={walletState}
            onBack={() => setCurrentView(activeTable ? 'lobby' : 'landing')}
          />
        )}
      </main>

      {/* Mobile Ergonomic Bottom Tab Bar */}
      <BottomTabBar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        hasActiveTable={!!activeTable}
      />
    </div>
  );
}
