import React, { useState, useEffect } from 'react';
import {
  Users,
  Copy,
  Check,
  Crown,
  Play,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Receipt,
  UserPlus,
  Wallet,
  AlertCircle,
  Server,
  HardDrive,
  ShieldAlert,
  Zap,
  RefreshCw,
  Cpu,
  Layers,
  Activity,
} from 'lucide-react';
import { Table, Participant, WalletState, EphemeralSession } from '../types';
import { tableService, getCurrentUserId } from '../services/tableService';
import { participantService } from '../services/participantService';
import { ephemeralRollupService } from '../services/ephemeralRollupService';
import { CurrencyConverter } from '../components/CurrencyConverter';
import {
  formatCents,
  parseToCents,
  parseToBaseUnits,
  calculateTableTotalCents,
  centsToDecimalString,
} from '../utils/currency';

interface TableLobbyPageProps {
  table: Table;
  walletState: WalletState;
  onTableUpdated: (table: Table) => void;
  onProceedToRoulette: () => void;
  onLeaveTable: () => void;
}

export const TableLobbyPage: React.FC<TableLobbyPageProps> = ({
  table,
  walletState,
  onTableUpdated,
  onProceedToRoulette,
  onLeaveTable,
}) => {
  const currentUserId = getCurrentUserId();
  const currentParticipant = table.participants.find((p) => p.id === currentUserId);
  const isHost = currentParticipant?.isHost || table.hostId === currentUserId;

  const [copiedCode, setCopiedCode] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editOrderValue, setEditOrderValue] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isActionPending, setIsActionPending] = useState(false);
  const [isRollupLoading, setIsRollupLoading] = useState(false);
  const [showConverter, setShowConverter] = useState(false);

  const [rollupSession, setRollupSession] = useState<EphemeralSession | null>(() => {
    return ephemeralRollupService.getSession(table.id) || table.ephemeralSession || null;
  });

  useEffect(() => {
    const unsubscribe = ephemeralRollupService.subscribeToSession(table.id, (session) => {
      setRollupSession(session);
    });
    return unsubscribe;
  }, [table.id]);

  const handleDelegateTable = async () => {
    setErrorMessage(null);
    setIsRollupLoading(true);
    try {
      const { table: updated, session } = await tableService.delegateTableToRollup(table.id, currentUserId);
      setRollupSession(session);
      onTableUpdated(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to delegate table to Ephemeral Rollup.');
    } finally {
      setIsRollupLoading(false);
    }
  };

  const handleSyncRollupState = async () => {
    setErrorMessage(null);
    setIsRollupLoading(true);
    try {
      const { table: updated, session } = await tableService.syncTableRollupState(table.id, currentUserId);
      setRollupSession(session);
      onTableUpdated(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to synchronize rollup state.');
    } finally {
      setIsRollupLoading(false);
    }
  };

  const handleUndelegateTable = async () => {
    setErrorMessage(null);
    setIsRollupLoading(true);
    try {
      const { table: updated, session } = await tableService.undelegateTableFromRollup(table.id, currentUserId);
      setRollupSession(session);
      onTableUpdated(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to undelegate table.');
    } finally {
      setIsRollupLoading(false);
    }
  };

  // Quick companion dialog
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);
  const [newFriendName, setNewFriendName] = useState('');
  const [newFriendAmount, setNewFriendAmount] = useState('');

  const totalBillCents = calculateTableTotalCents(table);
  const isLockedOrPending = table.status === 'LOCKED' || table.status === 'SPIN_PENDING';
  const isUsingSharedBackend = tableService.isUsingSharedBackend();

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(table.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleStartEditingOrder = (p: Participant) => {
    if (table.status !== 'OPEN') {
      setErrorMessage(`Cannot edit orders while table is ${table.status}.`);
      return;
    }
    setEditingOrderId(p.id);
    setEditOrderValue(centsToDecimalString(p.orderAmountCents, table.currency));
  };

  const handleSaveOrder = async (p: Participant) => {
    setErrorMessage(null);
    const cents = Number(parseToBaseUnits(editOrderValue, table.currency));
    const result = await participantService.updateParticipantOrder(table.id, p.id, cents);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to update order amount.');
      return;
    }

    setEditingOrderId(null);
    const refreshed = await tableService.getTable(table.id);
    if (refreshed) onTableUpdated(refreshed);
  };

  const handleRemoveParticipant = async (p: Participant) => {
    if (confirm(`Remove ${p.name} from this table?`)) {
      setErrorMessage(null);
      const res = await participantService.removeParticipant(table.id, p.id);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to remove participant.');
        return;
      }
      const refreshed = await tableService.getTable(table.id);
      if (refreshed) onTableUpdated(refreshed);
    }
  };

  const handleToggleLock = async () => {
    setErrorMessage(null);
    setIsActionPending(true);
    try {
      let updated: Table;
      if (table.status === 'OPEN') {
        updated = await tableService.lockTable(table.id, currentUserId);
      } else if (table.status === 'LOCKED') {
        updated = await tableService.unlockTable(table.id, currentUserId);
      } else {
        return;
      }
      onTableUpdated(updated);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Lock operation failed.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handlePrepareRound = async () => {
    setErrorMessage(null);
    setIsActionPending(true);
    try {
      const { table: preparedTable } = await tableService.prepareRound(table.id, currentUserId);
      onTableUpdated(preparedTable);
      onProceedToRoulette();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Round preparation failed.');
    } finally {
      setIsActionPending(false);
    }
  };

  const handleAddCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newFriendName.trim()) return;

    const orderCents = Number(parseToBaseUnits(newFriendAmount, table.currency));
    const joinResult = await participantService.joinTable({
      roomCode: table.roomCode,
      name: newFriendName.trim(),
      orderAmountCents: orderCents,
    });

    if (!joinResult.success || !joinResult.table) {
      setErrorMessage(joinResult.error || 'Failed to add participant.');
      return;
    }

    onTableUpdated(joinResult.table);
    setNewFriendName('');
    setNewFriendAmount('');
    setShowAddFriendModal(false);
  };

  // Connected wallet count
  const walletConnectedCount = table.participants.filter((p) => !!p.walletAddress).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Persistence Environment Indicator */}
      <div className="flex items-center justify-between text-xs px-1 text-[#8D958C]">
        <div className="flex items-center gap-2">
          {isUsingSharedBackend ? (
            <span className="flex items-center gap-1.5 text-emerald-400">
              <Server className="w-3.5 h-3.5 text-[#C8FF3D]" />
              <span className="font-medium text-emerald-300">Shared Server Active</span>
              <span aria-hidden="true" className="text-[#2C3830]">·</span>
              <span className="text-[#8D958C]">Cross-device multiplayer enabled</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-zinc-400">
              <HardDrive className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium text-amber-300">Local Sandbox Mode</span>
              <span aria-hidden="true" className="text-zinc-600">·</span>
              <span>Stored in browser memory</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-zinc-500 font-mono text-[11px]">v{table.version || 1}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
              <span>Table Lobby</span>
              <span aria-hidden="true">·</span>
              <span className="capitalize">{table.gameMode} mode</span>
              <span aria-hidden="true">·</span>
              <span>{table.currency}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`font-mono text-[11px] px-2 py-0.5 rounded border ${
                  table.status === 'OPEN'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : table.status === 'LOCKED'
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                    : table.status === 'SPIN_PENDING'
                    ? 'bg-[#C8FF3D]/10 text-[#C8FF3D] border-[#C8FF3D]/30'
                    : 'bg-[#121814] text-[#8D958C] border-[#1F2922]'
                }`}
              >
                {table.status}
              </span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-[#F5F7F2] tracking-tight">
              {table.name}
            </h1>
          </div>

          {/* Room Code Badge & Copy */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#050505] border border-[#1F2922]">
              <span className="text-[10px] uppercase font-bold text-[#8D958C] tracking-wider">
                Code:
              </span>
              <span className="font-mono text-sm font-bold text-[#C8FF3D] tracking-widest">
                {table.roomCode}
              </span>
            </div>

            <button
              onClick={handleCopyCode}
              aria-label="Copy invitation room code"
              className="p-2.5 rounded-xl bg-[#121814] hover:bg-[#17201B] text-[#F5F7F2] border border-[#1F2922] hover:border-[#C8FF3D]/40 transition-colors cursor-pointer"
              title="Copy room code"
            >
              {copiedCode ? <Check className="w-4 h-4 text-[#C8FF3D]" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* User Status Bar */}
        <div className="pt-3 border-t border-[#1C251F] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#8D958C]">
            <span>You:</span>
            <span className="font-semibold text-white">
              {currentParticipant ? currentParticipant.name : 'Spectator'}
            </span>
            {isHost && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C8FF3D] bg-[#C8FF3D]/10 px-2 py-0.5 rounded-md border border-[#C8FF3D]/20">
                <Crown className="w-3 h-3" /> Host
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-zinc-400">
            <span className="flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-zinc-400" />
              <span>
                {walletConnectedCount} of {table.participants.length} wallets linked
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* MagicBlock Ephemeral Rollup Interactive Engine Panel */}
      <div className="p-5 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] space-y-4 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#C8FF3D]/10 border border-[#C8FF3D]/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#C8FF3D]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-white tracking-wide">
                  MagicBlock Ephemeral Rollup Engine
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#121814] text-[#8D958C] border border-[#1F2922]">
                  SVM L2
                </span>
              </div>
              <p className="text-[11px] text-[#8D958C]">
                Sub-10ms table mutations & diner presence with base-layer VRF settlement safety
              </p>
            </div>
          </div>

          {/* Ephemeral Rollup Status Pill */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-xl border text-xs font-semibold ${
                rollupSession?.status === 'Session active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : rollupSession?.status === 'Transaction pending'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : rollupSession?.status === 'Delegation pending'
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                  : rollupSession?.status === 'Connecting'
                  ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                  : rollupSession?.status === 'Operation failed'
                  ? 'bg-[#FF5A5F]/10 text-[#FF5A5F] border-[#FF5A5F]/30'
                  : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  rollupSession?.status === 'Session active'
                    ? 'bg-emerald-400 animate-pulse'
                    : rollupSession?.status === 'Transaction pending'
                    ? 'bg-amber-400 animate-spin'
                    : rollupSession?.status === 'Operation failed'
                    ? 'bg-[#FF5A5F]'
                    : 'bg-cyan-400'
                }`}
              />
              <span>{rollupSession?.status || 'State synchronized'}</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-[#121814] border border-[#1F2922]">
            <span className="text-[10px] text-[#8D958C] uppercase font-semibold block">Execution Mode</span>
            <span className="font-mono text-[#F5F7F2] font-medium">
              {rollupSession?.isDelegated ? 'Rollup Accelerated' : 'Solana Mainnet L1'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#121814] border border-[#1F2922]">
            <span className="text-[10px] text-[#8D958C] uppercase font-semibold block">Transaction Latency</span>
            <span className="font-mono text-[#C8FF3D] font-medium">
              {rollupSession?.isDelegated ? '<5ms (Sub-10ms)' : '~400ms (Base Mainnet)'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#121814] border border-[#1F2922]">
            <span className="text-[10px] text-[#8D958C] uppercase font-semibold block">Diner Gas Fee</span>
            <span
              className={`font-mono font-medium ${
                rollupSession?.isGasless && rollupSession?.isDelegated ? 'text-emerald-400' : 'text-[#8D958C]'
              }`}
            >
              {rollupSession?.isGasless && rollupSession?.isDelegated ? '0 SOL (Gasless Active)' : 'Standard Solana Gas'}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-[#121814] border border-[#1F2922]">
            <span className="text-[10px] text-[#8D958C] uppercase font-semibold block">Ephemeral Slot</span>
            <span className="font-mono text-[#F5F7F2]">
              #{rollupSession?.ephemeralSlot || 105}
            </span>
          </div>
        </div>

        {/* Technical Architecture & Safety Guarantee */}
        <div className="text-[11px] text-[#8D958C] bg-[#121814] p-3 rounded-xl border border-[#1F2922] space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>
              <strong className="text-[#F5F7F2]">Account Delegation:</strong>{' '}
              {rollupSession?.isDelegated ? (
                <code className="text-[#C8FF3D] font-mono text-[10px]">DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh</code>
              ) : (
                <code className="text-[#8D958C] font-mono text-[10px]">Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq (Base L1)</code>
              )}
            </span>
            <span className="text-[#525A51] text-[10px] font-mono">
              Validator: {rollupSession?.validator || 'magicblock-mainnet-er-validator-01'}
            </span>
          </div>
          <p className="text-[11px] text-[#8D958C]">
            Diner order edits and table join requests execute inside the Ephemeral Rollup. When the round is prepared, state automatically commits to Mainnet L1 for verified MagicBlock VRF randomness.
          </p>
        </div>

        {/* Host Lifecycle Controls */}
        {isHost && table.status === 'OPEN' && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#1C251F]">
            {!rollupSession?.isDelegated ? (
              <button
                onClick={handleDelegateTable}
                disabled={isRollupLoading || isActionPending}
                className="px-3.5 py-2 rounded-xl bg-[#C8FF3D] text-[#050505] font-bold text-xs hover:bg-[#bbf330] disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-[#C8FF3D]/10"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isRollupLoading ? 'Delegating Account...' : 'Accelerate Table (Delegate to Ephemeral Rollup)'}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSyncRollupState}
                  disabled={isRollupLoading || isActionPending}
                  className="px-3 py-1.5 rounded-xl bg-[#121814] text-[#F5F7F2] hover:bg-[#17201B] text-xs font-semibold border border-[#1F2922] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRollupLoading ? 'animate-spin' : ''}`} />
                  <span>Commit State to L1</span>
                </button>

                <button
                  onClick={handleUndelegateTable}
                  disabled={isRollupLoading || isActionPending}
                  className="px-3 py-1.5 rounded-xl bg-[#121814] text-[#8D958C] hover:text-[#F5F7F2] hover:bg-[#17201B] text-xs font-semibold border border-[#1F2922] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Return to Base Layer</span>
                </button>
              </>
            )}

            {rollupSession?.status === 'Operation failed' && (
              <button
                onClick={handleDelegateTable}
                className="px-3 py-1.5 rounded-xl bg-[#FF5A5F]/20 text-[#FF5A5F] border border-[#FF5A5F]/40 text-xs font-semibold hover:bg-[#FF5A5F]/30 transition-colors cursor-pointer"
              >
                Retry Delegation
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table Currency Converter (For diners at the table) */}
      <div className="rounded-2xl border border-[#1C251F] bg-[#0B0F0D] p-3.5 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#F5F7F2]">💱 Currency Converter</span>
            <span className="text-[11px] text-[#8D958C]">
              Calculate any item bought in local currency (e.g. 5,000 NGN) into {table.currency}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowConverter(!showConverter)}
            className="text-xs text-[#C8FF3D] hover:underline font-medium cursor-pointer px-2 py-1 rounded bg-[#121814] border border-[#1F2922]"
          >
            {showConverter ? 'Hide Converter' : 'Open Converter'}
          </button>
        </div>

        {showConverter && (
          <CurrencyConverter
            variant="card"
            initialCurrencyCode="NGN"
            initialAmount="5000"
            targetCurrency={table.currency}
            title="Table Currency Converter"
            subtitle={`Convert any item you bought in your country's currency into ${table.currency}.`}
            onApplyAmount={(amountDecimal) => {
              if (currentParticipant && table.gameMode === 'individual') {
                setEditingOrderId(currentParticipant.id);
                setEditOrderValue(amountDecimal);
              }
            }}
          />
        )}
      </div>

      {/* Bill Summary Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#0B0F0D] via-[#121814] to-[#070A08] border border-[#1C251F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-semibold tracking-wider text-[#8D958C]">
            Current Running Total
          </span>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-[#F5F7F2] mt-1 tabular-nums">
            {formatCents(totalBillCents, table.currency)}
          </div>
          <p className="text-xs text-[#525A51] mt-1">
            Calculated in integer base units ({table.currency === 'SOL' ? 'lamports' : 'micro-USDC'})
          </p>
        </div>

        {/* Host Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Lock / Unlock Toggle (Host only) */}
          {isHost && (table.status === 'OPEN' || table.status === 'LOCKED') && (
            <button
              onClick={handleToggleLock}
              disabled={isActionPending}
              className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#121814] hover:bg-[#17201B] border border-[#1F2922] text-xs font-semibold text-[#F5F7F2] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {table.status === 'OPEN' ? (
                <>
                  <Lock className="w-4 h-4 text-[#8D958C]" />
                  <span>Lock Orders</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4 text-[#C8FF3D]" />
                  <span>Unlock Orders</span>
                </>
              )}
            </button>
          )}

          {table.participants.length < 2 && (
            <button
              onClick={() => setShowAddFriendModal(true)}
              className="min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#121814] text-[#F5F7F2] border border-[#1F2922] hover:border-[#C8FF3D]/40 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-[#C8FF3D]" />
              <span>Add Companion</span>
            </button>
          )}

          {/* Action button based on status */}
          {table.status === 'SPIN_PENDING' ? (
            <button
              onClick={onProceedToRoulette}
              className="min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center gap-2 bg-[#C8FF3D] text-[#050505] hover:bg-[#bbf330] active:scale-[0.98] shadow-[0_0_20px_rgba(200,255,61,0.25)] cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Go to Roulette Wheel</span>
            </button>
          ) : isHost ? (
            <button
              onClick={handlePrepareRound}
              disabled={table.participants.length < 2 || isActionPending}
              className={`min-h-[46px] px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                table.participants.length >= 2 && !isActionPending
                  ? 'bg-[#C8FF3D] text-[#050505] hover:bg-[#bbf330] active:scale-[0.98] shadow-[0_0_20px_rgba(200,255,61,0.25)]'
                  : 'bg-[#121814] text-[#525A51] cursor-not-allowed border border-[#1F2922]'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Prepare Round & Spin ({table.participants.length} seated)</span>
            </button>
          ) : (
            <button
              onClick={onProceedToRoulette}
              disabled={table.participants.length < 2}
              className="min-h-[46px] px-5 py-2.5 rounded-xl font-semibold text-xs tracking-wide bg-[#121814] text-[#F5F7F2] border border-[#1F2922] flex items-center gap-2 cursor-pointer hover:bg-[#17201B]"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>View Roulette ({table.participants.length} seated)</span>
            </button>
          )}
        </div>
      </div>

      {/* Participants List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#8D958C]">
            <Users className="w-4 h-4 text-[#8D958C]" />
            <span>Seated Participants ({table.participants.length})</span>
          </div>

          {table.status === 'OPEN' && (
            <button
              onClick={() => setShowAddFriendModal(true)}
              className="text-xs text-[#C8FF3D] hover:underline inline-flex items-center gap-1 cursor-pointer py-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add companion</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {table.participants.map((p, idx) => {
            const isMe = p.id === currentUserId;
            const isEditing = editingOrderId === p.id;

            return (
              <div
                key={p.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isMe
                    ? 'bg-[#121814] border-[#C8FF3D]/50 shadow-[0_0_12px_rgba(200,255,61,0.1)]'
                    : 'bg-[#0B0F0D] border-[#1C251F] hover:border-[#1F2922]'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-full bg-[#121814] border border-[#1F2922] flex items-center justify-center font-display font-bold text-xs text-[#F5F7F2]">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-[#F5F7F2]">{p.name}</span>
                      {p.isHost && (
                        <span className="text-[10px] font-medium text-[#C8FF3D] bg-[#C8FF3D]/10 px-1.5 py-0.5 rounded border border-[#C8FF3D]/20 flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" /> Host
                        </span>
                      )}
                      {isMe && (
                        <span className="text-[10px] font-mono text-[#8D958C] bg-[#121814] px-1.5 py-0.5 rounded border border-[#1F2922]">
                          You
                        </span>
                      )}
                    </div>
                    {p.walletAddress ? (
                      <span className="font-mono text-[11px] text-[#C8FF3D]/90">
                        {p.walletAddress.slice(0, 4)}...{p.walletAddress.slice(-4)}
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-[#525A51]">
                        Wallet not linked
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Amount and Editing */}
                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-auto">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editOrderValue}
                        onChange={(e) => setEditOrderValue(e.target.value)}
                        placeholder="0.00"
                        className="w-24 h-9 px-2 rounded-lg bg-black border border-[#C8FF3D] text-white text-xs font-mono text-right focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveOrder(p)}
                        className="h-9 px-3 rounded-lg bg-[#C8FF3D] text-black font-semibold text-xs hover:bg-[#bbf330] cursor-pointer"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="font-mono text-base font-bold text-white tabular-nums">
                          {formatCents(p.orderAmountCents, table.currency)}
                        </span>
                        <div className="text-[10px] text-[#8D958C]">
                          {table.gameMode === 'individual' ? 'Order share' : 'Participant'}
                        </div>
                      </div>

                      {/* Edit Button for own order or host */}
                      {(isMe || isHost) && table.gameMode === 'individual' && table.status === 'OPEN' && (
                        <button
                          onClick={() => handleStartEditingOrder(p)}
                          className="p-2 rounded-lg bg-[#121814] hover:bg-[#17201B] text-[#8D958C] hover:text-white transition-colors cursor-pointer border border-[#1F2922]"
                          title="Edit order amount"
                          aria-label="Edit order amount"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Remove button (host only, cannot remove host, only when open) */}
                      {isHost && !p.isHost && table.status === 'OPEN' && (
                        <button
                          onClick={() => handleRemoveParticipant(p)}
                          className="p-2 rounded-lg bg-[#121814] hover:bg-[#FF5A5F]/20 text-[#8D958C] hover:text-[#FF5A5F] transition-colors cursor-pointer border border-[#1F2922]"
                          title="Remove from table"
                          aria-label="Remove participant"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal: Quick Add Companion / Friend */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-3xl bg-[#0B0F0D] border border-[#1C251F] p-6 space-y-4 shadow-2xl">
            <h2 className="font-display text-lg font-bold text-white">
              Add Dinner Companion
            </h2>
            <p className="text-xs text-[#8D958C]">
              Add a friend sitting at the table, or have them join with code <span className="text-[#C8FF3D] font-mono">{table.roomCode}</span> on their phone!
            </p>

            <form onSubmit={handleAddCompanion} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#F5F7F2]">Companion Name</label>
                <input
                  type="text"
                  placeholder="e.g. Sam, Chloe, Dan"
                  value={newFriendName}
                  onChange={(e) => setNewFriendName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#050505] border border-[#1F2922] text-white text-xs focus:border-[#C8FF3D] focus:outline-none"
                  autoFocus
                />
              </div>

              {table.gameMode === 'individual' && (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#F5F7F2]">
                    Order Amount ({table.currency})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder={table.currency === 'SOL' ? '0.25' : '15.00'}
                    value={newFriendAmount}
                    onChange={(e) => setNewFriendAmount(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#050505] border border-[#1F2922] text-white text-xs font-mono focus:border-[#C8FF3D] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#8D958C]">
                    Recorded in {table.currency === 'SOL' ? 'lamports (9 decimals)' : 'micro-USDC (6 decimals)'}.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddFriendModal(false)}
                  className="flex-1 h-11 rounded-xl bg-[#121814] text-[#8D958C] hover:text-white border border-[#1F2922] text-xs font-semibold hover:bg-[#17201B] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-[#C8FF3D] text-[#050505] text-xs font-bold hover:bg-[#bbf330] cursor-pointer shadow-[0_0_12px_rgba(200,255,61,0.2)]"
                >
                  Seat Companion
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-4 border-t border-[#1C251F]">
        <button
          onClick={onLeaveTable}
          className="text-xs text-[#8D958C] hover:text-white transition-colors cursor-pointer py-1"
        >
          Leave Table
        </button>

        <span className="text-xs text-[#525A51]">
          At least 2 participants required to spin
        </span>
      </div>
    </div>
  );
};
