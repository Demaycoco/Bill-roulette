import React, { useState } from 'react';
import {
  Wallet as WalletIcon,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Coins,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { WalletState } from '../types';
import { walletService } from '../services/walletService';
import { solanaTransactionService } from '../services/solanaTransactionService';

interface WalletPageProps {
  walletState: WalletState;
  onBack: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ walletState, onBack }) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [airdropMessage, setAirdropMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopyAddress = async () => {
    if (!walletState.publicKey) return;
    try {
      await navigator.clipboard.writeText(walletState.publicKey);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await walletService.refreshBalance();
    setIsRefreshing(false);
  };

  const handleRequestAirdrop = async () => {
    setIsAirdropping(true);
    setAirdropMessage(null);

    const result = await walletService.requestAirdrop();
    setIsAirdropping(false);

    if (result.success) {
      setAirdropMessage('Successfully received 1 SOL on Devnet!');
    } else {
      setAirdropMessage(result.error || 'Airdrop rate limit reached. Try solfaucet.com.');
    }
  };

  const solBalance =
    walletState.balanceLamports !== null
      ? (walletState.balanceLamports / 1_000_000_000).toFixed(4)
      : '0.0000';

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div>
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
          Solana Devnet Wallet
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Manage your Solana account for signing and settlement on Devnet.
        </p>
      </div>

      {walletState.error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{walletState.error}</span>
        </div>
      )}

      {walletState.connected && walletState.publicKey ? (
        /* Connected State */
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] shadow-[0_0_8px_#ccff00]" />
                <span className="text-xs font-semibold text-white">
                  {walletState.walletName || 'Connected'}
                </span>
              </div>
              <span className="text-[11px] font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                Solana Devnet
              </span>
            </div>

            {/* Address Row */}
            <div className="p-3 rounded-xl bg-black border border-zinc-800 flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-zinc-300 truncate">
                {walletState.publicKey}
              </span>
              <button
                onClick={handleCopyAddress}
                aria-label="Copy wallet address"
                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0 cursor-pointer"
                title="Copy address"
              >
                {copiedAddress ? (
                  <Check className="w-4 h-4 text-[#ccff00]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Balance Box */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  Devnet Balance
                </span>
                <div className="font-mono text-2xl font-extrabold text-white mt-0.5">
                  ◎ {solBalance} SOL
                </div>
              </div>

              <button
                onClick={handleRefreshBalance}
                disabled={isRefreshing}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                title="Refresh Devnet Balance"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#ccff00]' : ''}`}
                />
              </button>
            </div>

            {/* Devnet Faucet Airdrop Button */}
            <div className="space-y-2">
              <button
                onClick={handleRequestAirdrop}
                disabled={isAirdropping}
                className="w-full h-11 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/80 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Coins className="w-4 h-4 text-[#ccff00]" />
                <span>
                  {isAirdropping ? 'Requesting Devnet Airdrop...' : 'Request 1 SOL Devnet Airdrop'}
                </span>
              </button>

              {airdropMessage && (
                <div className="text-center text-xs text-zinc-400 font-mono">
                  {airdropMessage}
                </div>
              )}
            </div>

            {/* Explorer Link */}
            <div className="pt-2 text-center">
              <a
                href={solanaTransactionService.getAccountExplorerUrl(walletState.publicKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#ccff00] hover:underline font-mono"
              >
                <span>View Address on Solana Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Disconnect Button */}
            <div className="pt-3 border-t border-zinc-800">
              <button
                onClick={() => walletService.disconnect()}
                className="w-full h-10 rounded-xl bg-zinc-950 hover:bg-rose-950/40 text-zinc-400 hover:text-rose-300 border border-zinc-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                Disconnect Wallet
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Disconnected State */
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 mx-auto flex items-center justify-center">
              <WalletIcon className="w-6 h-6 text-zinc-300" />
            </div>

            <div className="space-y-1">
              <h2 className="font-display text-lg font-bold text-white">
                Connect to Solana Devnet
              </h2>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Connect your browser extension wallet or generate an isolated Devnet testing keypair.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={() => walletService.connectBrowserWallet()}
                disabled={walletState.isConnecting}
                className="w-full h-12 rounded-xl bg-[#ccff00] text-black font-semibold text-xs uppercase tracking-wide hover:bg-[#b8e600] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(204,255,0,0.2)] cursor-pointer"
              >
                <WalletIcon className="w-4 h-4" />
                <span>
                  {walletState.isConnecting ? 'Connecting...' : 'Connect Browser Wallet (Phantom/Solflare)'}
                </span>
              </button>

              <button
                onClick={() => walletService.connectDevnetTestWallet()}
                disabled={walletState.isConnecting}
                className="w-full h-11 rounded-xl bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <KeyRound className="w-4 h-4 text-[#ccff00]" />
                <span>Launch Devnet Sandbox Wallet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Guarantee Card */}
      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex items-start gap-3 text-xs text-zinc-400">
        <ShieldCheck className="w-5 h-5 text-[#ccff00] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-zinc-200">Security Guarantee</span>
          <p className="leading-relaxed text-[11px]">
            Bill Roulette never requests, accesses, or stores private keys or seed phrases. All interactions adhere to standard Solana wallet adapter protocols targeting Solana Devnet.
          </p>
        </div>
      </div>
    </div>
  );
};
