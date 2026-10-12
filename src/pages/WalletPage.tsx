import React, { useState, useEffect } from 'react';
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
  CheckCircle2,
  Loader2,
  ArrowLeftRight,
} from 'lucide-react';
import { WalletState, SupportedWalletId } from '../types';
import { walletService } from '../services/walletService';
import { solanaTransactionService } from '../services/solanaTransactionService';
import { sound } from '../utils/audio';
import { ConnectWalletModal } from '../components/ConnectWalletModal';
import { formatBaseUnits, MAINNET_USDC_MINT } from '../utils/currency';

interface WalletPageProps {
  walletState: WalletState;
  onBack: () => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ walletState, onBack }) => {
  const [copiedAddress, setCopiedAddress] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [connectingId, setConnectingId] = useState<SupportedWalletId | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [airdropFeedback, setAirdropFeedback] = useState<{ msg: string; success: boolean } | null>(null);

  const handleRequestAirdrop = async () => {
    sound.playClick();
    if (!walletState.publicKey || isAirdropping) return;
    setIsAirdropping(true);
    setAirdropFeedback(null);
    const res = await walletService.requestAirdrop();
    setIsAirdropping(false);
    if (res.success) {
      setAirdropFeedback({ msg: 'Received 1 Devnet SOL!', success: true });
    } else {
      setAirdropFeedback({ msg: res.error || 'Airdrop rate limit reached. Please use faucet.solana.com', success: false });
    }
  };

  const handleCopyAddress = async (address: string) => {
    sound.playClick();
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      // ignore
    }
  };

  const handleRefreshBalance = async () => {
    sound.playClick();
    setIsRefreshing(true);
    await walletService.refreshBalance();
    setIsRefreshing(false);
  };

  const handleConnectSpecific = async (walletId: SupportedWalletId) => {
    sound.playClick();
    setConnectingId(walletId);
    await walletService.connectWallet(walletId);
    setConnectingId(null);
  };

  const solBalance =
    walletState.balanceLamports !== null
      ? (walletState.balanceLamports / 1_000_000_000).toFixed(4)
      : '0.0000';

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const availableWallets = walletService.getAvailableWallets();

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      <ConnectWalletModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      <button
        onClick={() => {
          sound.playClick();
          onBack();
        }}
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
          Manage your Solana Devnet account for real check settlements and verifiable spins.
        </p>
      </div>

      {walletState.error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{walletState.error}</span>
        </div>
      )}

      {airdropFeedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            airdropFeedback.success
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
          }`}
        >
          {airdropFeedback.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <span>{airdropFeedback.msg}</span>
        </div>
      )}

      {walletState.connected && walletState.publicKey ? (
        /* Connected State */
        <div className="space-y-5">
          {/* Active Wallet Card */}
          <div className="p-6 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C8FF3D] shadow-[0_0_8px_#C8FF3D]" />
                <span className="text-xs font-semibold text-[#F5F7F2]">
                  {walletState.walletName || 'Connected'}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#121814] text-[#8D958C] border border-[#1F2922]">
                  Connected Wallet
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#8D958C] bg-[#121814] border border-[#1F2922] px-2 py-0.5 rounded">
                Solana Devnet
              </span>
            </div>

            {/* Address Row */}
            <div className="p-3 rounded-xl bg-[#050505] border border-[#1F2922] flex items-center justify-between gap-3">
              <span className="font-mono text-xs text-[#8D958C] truncate">
                {walletState.publicKey}
              </span>
              <button
                onClick={() => handleCopyAddress(walletState.publicKey || '')}
                aria-label="Copy wallet address"
                className="p-1.5 rounded-lg bg-[#121814] hover:bg-[#17201B] text-[#8D958C] hover:text-[#F5F7F2] transition-colors shrink-0 cursor-pointer"
                title="Copy address"
              >
                {copiedAddress ? (
                  <Check className="w-4 h-4 text-[#C8FF3D]" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Balances Box (Native SOL and Circle Devnet USDC) */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-[#050505] to-[#121814] border border-[#1F2922] space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider text-[#8D958C] font-semibold">
                  Solana Devnet Balances
                </span>
                <button
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="p-1.5 rounded-lg bg-[#121814] hover:bg-[#17201B] border border-[#1F2922] text-[#8D958C] hover:text-[#F5F7F2] transition-colors cursor-pointer"
                  title="Refresh Balances"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#C8FF3D]' : ''}`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* SOL Balance */}
                <div className="p-3 rounded-lg bg-[#050505] border border-[#1F2922]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#8D958C]">Native SOL</span>
                    <span className="text-[10px] font-mono text-[#C8FF3D]">9 Decimals</span>
                  </div>
                  <div className="font-mono text-xl font-extrabold text-[#C8FF3D] mt-1 tabular-nums">
                    ◎ {solBalance} SOL
                  </div>
                </div>

                {/* USDC Balance */}
                <div className="p-3 rounded-lg bg-[#050505] border border-[#1F2922]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-[#8D958C]">Circle USDC</span>
                    <span className="text-[10px] font-mono text-[#2775CA]">6 Decimals</span>
                  </div>
                  <div className="font-mono text-xl font-extrabold text-white mt-1 tabular-nums">
                    {formatBaseUnits(walletState.balanceUsdcBaseUnits ?? 0, 'USDC', { includeCode: true })}
                  </div>
                </div>
              </div>

              {/* Devnet Mint Verification Tag */}
              <div className="p-2.5 rounded-lg bg-[#0B0F0D] border border-[#1C251F] flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#C8FF3D] shrink-0" />
                  <span>Devnet USDC Mint Verified</span>
                </div>
                <span className="font-mono text-[10px] text-[#8D958C]">
                  {MAINNET_USDC_MINT.slice(0, 4)}...{MAINNET_USDC_MINT.slice(-4)}
                </span>
              </div>
            </div>

            {/* Devnet Airdrop Action Button */}
            <div className="p-3.5 rounded-xl bg-[#121814] border border-[#1F2922] flex items-center justify-between text-xs text-[#8D958C]">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#C8FF3D]" />
                <span className="text-[#F5F7F2] font-semibold">Devnet Faucet Helper</span>
              </div>
              <button
                onClick={handleRequestAirdrop}
                disabled={isAirdropping}
                className="px-3 py-1.5 rounded-lg bg-[#C8FF3D] hover:bg-[#bbf330] text-[#050505] font-semibold font-mono text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAirdropping ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Requesting...</span>
                  </>
                ) : (
                  <span>+ 1 SOL Airdrop</span>
                )}
              </button>
            </div>

            {/* Explorer Link */}
            <div className="pt-2 text-center">
              <a
                href={solanaTransactionService.getAccountExplorerUrl(walletState.publicKey)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#C8FF3D] hover:underline font-mono"
              >
                <span>View Address on Solana Explorer</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* Action Buttons: Switch Wallet & Disconnect */}
            <div className="pt-3 border-t border-[#1C251F] grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  sound.playClick();
                  setIsModalOpen(true);
                }}
                className="w-full h-10 rounded-xl bg-[#121814] hover:bg-[#17201B] text-[#F5F7F2] border border-[#1F2922] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Switch Wallet</span>
              </button>

              <button
                onClick={() => {
                  sound.playClick();
                  walletService.disconnect();
                }}
                className="w-full h-10 rounded-xl bg-[#050505] hover:bg-rose-950/40 text-[#8D958C] hover:text-rose-300 border border-[#1F2922] text-xs font-semibold transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Disconnected State - Premium Cards matching Step 5 */
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-[#0B0F0D] border border-[#1C251F] space-y-5 text-left shadow-xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-full bg-[#121814] border border-[#1F2922] mx-auto flex items-center justify-center mb-2">
                <WalletIcon className="w-6 h-6 text-[#C8FF3D]" />
              </div>
              <h2 className="font-display text-xl font-bold text-[#F5F7F2]">
                Connect Wallet
              </h2>
              <p className="text-xs text-[#8D958C] max-w-sm mx-auto">
                Choose your Solana wallet
              </p>
            </div>

              {/* Individual Wallet Selection Cards */}
            <div className="space-y-2.5 pt-2">
              {availableWallets
                .filter((w) => w.isExternal)
                .map((wallet) => (
                  <button
                    key={wallet.id}
                    onClick={() => handleConnectSpecific(wallet.id)}
                    disabled={connectingId !== null}
                    className="w-full min-h-[62px] p-3.5 rounded-2xl bg-[#050505] hover:bg-[#121814] border border-[#1F2922] hover:border-[#2C3830] transition-all flex items-center justify-between gap-3 text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Official Phantom Logo */}
                      {wallet.id === 'phantom' && (
                        <svg viewBox="0 0 128 128" className="w-8 h-8 shrink-0 rounded-lg drop-shadow" fill="none">
                          <rect width="128" height="128" rx="28" fill="#AB9FF2" />
                          <path
                            d="M110.58 64.97C108.97 40.23 88.66 21 64 21C38.6 21 17.8 41.34 17.02 67.04C16.19 94.27 37.6 107 51.5 107C58.33 107 60.1 103.35 64.12 103.35C68.64 103.35 70.33 107 77.5 107C92.5 107 111.45 88.8 110.58 64.97ZM46 68.5C41.86 68.5 38.5 65.14 38.5 61C38.5 56.86 41.86 53.5 46 53.5C50.14 53.5 53.5 56.86 53.5 61C53.5 65.14 50.14 68.5 46 68.5ZM79 68.5C74.86 68.5 71.5 65.14 71.5 61C71.5 56.86 74.86 53.5 79 53.5C83.14 53.5 86.5 56.86 86.5 61C86.5 65.14 83.14 68.5 79 68.5Z"
                            fill="#1C1829"
                          />
                          <path
                            d="M46 57C43.79 57 42 58.79 42 61C42 63.21 43.79 65 46 65C48.21 65 50 63.21 50 61C50 58.79 48.21 57 46 57Z"
                            fill="#FFFFFF"
                          />
                          <path
                            d="M79 57C76.79 57 75 58.79 75 61C75 63.21 76.79 65 79 65C81.21 65 83 63.21 83 61C83 58.79 81.21 57 79 57Z"
                            fill="#FFFFFF"
                          />
                        </svg>
                      )}
                      {/* Official Solflare Logo */}
                      {wallet.id === 'solflare' && (
                        <svg viewBox="0 0 128 128" className="w-8 h-8 shrink-0 rounded-lg drop-shadow" fill="none">
                          <rect width="128" height="128" rx="28" fill="#181528" />
                          <path
                            d="M96.3 78.4C95.2 60.5 82.5 46.1 66.8 41.5C65.2 41 63.8 42.4 64.1 44C66.4 56.5 59.8 67.2 49.3 71.3C47.8 71.9 47.4 73.8 48.6 74.8C59.9 84.4 76.7 85.3 87.5 76.7C88.6 75.8 90.2 76.2 90.7 77.5C92.2 81.5 91.5 86.1 88.5 89.5C87.4 90.7 88.2 92.6 89.8 92.4C100.9 90.8 108 79.5 106.8 68.1C106.2 62.4 103.4 57.3 99.4 53.6C98.2 52.5 96.3 53.3 96.2 54.9C96 61.2 93.6 67.2 89.5 71.8C88.5 72.9 86.8 72.4 86.5 71C84.7 62.9 78.9 56.4 71.2 53.5C69.7 52.9 68.3 54.3 68.7 55.8C72.2 68.9 63.2 81.3 50.1 81.7C48.5 81.7 47.6 80 48.6 78.8C54.4 71.7 54.2 61.5 48.6 54.5C40.6 44.5 37.8 30.5 41.8 18.2C42.3 16.6 40.8 15.2 39.3 15.8C28.4 20.3 20.1 30.2 18.2 42.4C15.6 58.7 25.1 74.3 40.5 80.8C42 81.4 42.3 83.4 41.1 84.4C32.1 91.9 29.8 104.7 36 114.7C37 116.3 39.4 116.1 40.1 114.4C44.4 104 53.8 96.5 65.1 95C66.7 94.8 67.6 96.6 66.7 97.8C61.4 105.1 63.1 115.5 70.8 120.7C72.2 121.6 74 120.7 74.3 119.1C75.8 111.4 81.5 105.4 89.1 103.5C90.7 103.1 91.8 101.4 91.3 99.8C89.9 95.2 90.7 90.3 93.4 86.6C95.4 83.9 96.5 80.6 96.3 78.4Z"
                            fill="url(#solflare_wp_grad)"
                          />
                          <defs>
                            <linearGradient id="solflare_wp_grad" x1="18" y1="15" x2="110" y2="120" gradientUnits="userSpaceOnUse">
                              <stop stopColor="#FFDD33" />
                              <stop offset="0.5" stopColor="#FC7226" />
                              <stop offset="1" stopColor="#FF3B30" />
                            </linearGradient>
                          </defs>
                        </svg>
                      )}
                      {/* Official Backpack Logo */}
                      {wallet.id === 'backpack' && (
                        <svg viewBox="0 0 128 128" className="w-8 h-8 shrink-0 rounded-lg drop-shadow" fill="none">
                          <rect width="128" height="128" rx="28" fill="#1F2023" />
                          <path d="M42 38C42 27 50.95 18 62 18H66C77.05 18 86 27 86 38V42H42V38Z" fill="#E33E38" />
                          <path
                            d="M32 46C32 43.79 33.79 42 36 42H92C94.21 42 96 43.79 96 46V98C96 104.63 90.63 110 84 110H44C37.37 110 32 104.63 32 98V46Z"
                            fill="#E33E38"
                          />
                          <rect x="42" y="58" width="44" height="28" rx="6" fill="#17181A" />
                          <rect x="58" y="70" width="12" height="4" rx="2" fill="#E33E38" />
                        </svg>
                      )}
                      {/* Other Standard / Detected Wallets */}
                      {wallet.id === 'standard' && (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                          <WalletIcon className="w-4 h-4 text-indigo-400" />
                        </div>
                      )}
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-[#F5F7F2] group-hover:text-[#C8FF3D] transition-colors">
                            {wallet.name}
                          </span>
                          {wallet.isInstalled && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/25">
                              Detected
                            </span>
                          )}
                          {!wallet.isInstalled && isMobile && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#121814] text-[#8D958C] font-medium">
                              Mobile Link
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#8D958C] truncate mt-0.5">
                          {wallet.description}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {connectingId === wallet.id ? (
                        <Loader2 className="w-5 h-5 text-[#C8FF3D] animate-spin" />
                      ) : wallet.isInstalled ? (
                        <span className="text-xs font-semibold text-[#C8FF3D] font-mono">Connect</span>
                      ) : isMobile ? (
                        <span className="text-xs font-semibold text-[#8D958C] font-mono">Open App</span>
                      ) : (
                        <span className="text-[11px] text-[#525A51]">Install</span>
                      )}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Guarantee Card */}
      <div className="p-4 rounded-xl bg-[#0B0F0D] border border-[#1C251F] flex items-start gap-3 text-xs text-[#8D958C]">
        <ShieldCheck className="w-5 h-5 text-[#C8FF3D] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-semibold text-[#F5F7F2]">Security Guarantee</span>
          <p className="leading-relaxed text-[11px]">
            Bill Roulette never requests, accesses, or stores private keys or seed phrases. All interactions adhere to standard Solana wallet adapter protocols targeting Solana Devnet.
          </p>
        </div>
      </div>
    </div>
  );
};
