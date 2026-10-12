import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { WalletState, SupportedWalletId } from '../types';
import { MAGICBLOCK_CONFIG } from '../config/magicblock';
import { DEVNET_USDC_MINT } from '../utils/currency';

export const SOLANA_DEVNET_RPC = MAGICBLOCK_CONFIG.solanaRpcUrl || 'https://api.devnet.solana.com';
const STORAGE_BURNER_KEY = 'bill_roulette_devnet_burner_pk';
const TOKEN_PROGRAM_ID_STR = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

export interface WalletOption {
  id: SupportedWalletId;
  name: string;
  description: string;
  isInstalled: boolean;
  isExternal: boolean;
  downloadUrl: string;
  universalLink?: string;
}

export interface AirdropResult {
  success: boolean;
  signature?: string;
  error?: string;
  errorCode?:
    | 'RATE_LIMITED'
    | 'INSUFFICIENT_FAUCET'
    | 'RPC_UNAVAILABLE'
    | 'NOT_DEVNET'
    | 'INVALID_KEY'
    | 'NO_WALLET'
    | 'CONFIRMATION_TIMEOUT'
    | 'TRANSACTION_FAILED'
    | 'UNKNOWN';
  explorerUrl?: string;
  balanceRefreshed: boolean;
  currentBalanceSol?: number;
  faucetAlternativeUrl?: string;
}

type WalletListener = (state: WalletState) => void;

interface ExternalSolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toString: () => string };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey?: { toString: () => string } } | void>;
  disconnect: () => Promise<void>;
  signTransaction?: (tx: import('@solana/web3.js').Transaction) => Promise<import('@solana/web3.js').Transaction>;
  signAndSendTransaction?: (tx: import('@solana/web3.js').Transaction) => Promise<{ signature: string }>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getPhantomProvider(): ExternalSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;
  if (anyWin.phantom?.solana?.isPhantom) return anyWin.phantom.solana;
  if (anyWin.solana?.isPhantom) return anyWin.solana;
  return null;
}

function getSolflareProvider(): ExternalSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;
  if (anyWin.solflare?.isSolflare || anyWin.solflare) return anyWin.solflare;
  return null;
}

function getBackpackProvider(): ExternalSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;
  if (anyWin.backpack?.solana?.isBackpack) return anyWin.backpack.solana;
  if (anyWin.backpack?.isBackpack || anyWin.backpack) return anyWin.backpack;
  return null;
}

function getOtherStandardProvider(): { name: string; provider: ExternalSolanaProvider } | null {
  if (typeof window === 'undefined') return null;
  const anyWin = window as any;
  const sol = anyWin.solana;
  if (!sol) return null;
  // If already phantom, solflare, or backpack, handle by specific cards
  if (sol.isPhantom || sol.isSolflare || sol.isBackpack) return null;
  const name = sol.isBraveWallet
    ? 'Brave Wallet'
    : sol.isCoinbaseWallet
    ? 'Coinbase Wallet'
    : sol.name || 'Solana Standard Wallet';
  return { name, provider: sol };
}

class WalletService {
  private connection: Connection;
  private state: WalletState = {
    connected: false,
    publicKey: null,
    walletName: null,
    walletId: null,
    balanceLamports: null,
    balanceUsdcBaseUnits: null,
    isConnecting: false,
    error: null,
    network: 'devnet',
    isExternal: false,
  };
  private listeners: Set<WalletListener> = new Set();
  private burnerKeypair: Keypair | null = null;
  private activeProvider: ExternalSolanaProvider | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_DEVNET_RPC, {
      commitment: 'confirmed',
      disableRetryOnRateLimit: true,
    });
    this.initSavedState();
  }

  private initSavedState() {
    if (typeof window === 'undefined') return;
    try {
      const savedBurner = localStorage.getItem(STORAGE_BURNER_KEY);
      if (savedBurner) {
        const secret = Uint8Array.from(JSON.parse(savedBurner));
        this.burnerKeypair = Keypair.fromSecretKey(secret);
      } else {
        this.burnerKeypair = Keypair.generate();
        localStorage.setItem(
          STORAGE_BURNER_KEY,
          JSON.stringify(Array.from(this.burnerKeypair.secretKey))
        );
      }
      // Start in disconnected state so users explicitly connect external wallet
      this.state.connected = false;
      this.state.publicKey = null;
      this.state.walletName = null;
      this.state.walletId = null;
      this.state.isExternal = false;
    } catch {
      // ignore
    }
  }

  public getConnection(): Connection {
    return this.connection;
  }

  public getState(): WalletState {
    return { ...this.state };
  }

  public getPublicKey(): string | null {
    return this.state.publicKey;
  }

  public isConnected(): boolean {
    return this.state.connected;
  }

  public subscribe(listener: WalletListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  /**
   * List discoverable and supported Solana wallets
   */
  public getAvailableWallets(): WalletOption[] {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://billroulette.app';
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://billroulette.app';

    const otherStd = getOtherStandardProvider();

    const options: WalletOption[] = [
      {
        id: 'phantom',
        name: 'Phantom',
        description: 'Connect with Phantom',
        isInstalled: !!getPhantomProvider(),
        isExternal: true,
        downloadUrl: 'https://phantom.app/download',
        universalLink: `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(origin)}`,
      },
      {
        id: 'solflare',
        name: 'Solflare',
        description: 'Connect with Solflare',
        isInstalled: !!getSolflareProvider(),
        isExternal: true,
        downloadUrl: 'https://solflare.com/download',
        universalLink: `https://solflare.com/ul/v1/browse/${encodeURIComponent(currentUrl)}`,
      },
      {
        id: 'backpack',
        name: 'Backpack',
        description: 'Connect with Backpack',
        isInstalled: !!getBackpackProvider(),
        isExternal: true,
        downloadUrl: 'https://backpack.app/download',
      },
    ];

    if (otherStd) {
      options.push({
        id: 'standard',
        name: otherStd.name,
        description: `Connect with ${otherStd.name}`,
        isInstalled: true,
        isExternal: true,
        downloadUrl: '',
      });
    }

    return options;
  }

  /**
   * Connect to a specific supported Solana wallet (Phantom, Solflare, Backpack)
   */
  public async connectWallet(
    walletId: SupportedWalletId
  ): Promise<{ success: boolean; redirectedToMobile?: boolean; error?: string }> {
    this.state.isConnecting = true;
    this.state.error = null;
    this.emit();

    try {
      const isMobile = isMobileDevice();

      if (walletId === 'phantom') {
        const provider = getPhantomProvider();
        if (!provider) {
          if (isMobile && typeof window !== 'undefined') {
            const currentUrl = window.location.href;
            const origin = window.location.origin;
            const deepLink = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}?ref=${encodeURIComponent(origin)}`;
            window.location.href = deepLink;
            this.state.isConnecting = false;
            this.emit();
            return { success: false, redirectedToMobile: true };
          }
          throw new Error('Phantom extension not detected. Please install Phantom from phantom.app or open via Phantom mobile app.');
        }

        const res = await provider.connect();
        const pubkeyStr =
          (res && (res as any).publicKey ? (res as any).publicKey.toString() : provider.publicKey?.toString()) || '';
        if (!pubkeyStr) throw new Error('No public key returned from Phantom.');

        this.activeProvider = provider;
        this.state.connected = true;
        this.state.publicKey = pubkeyStr;
        this.state.walletName = 'Phantom';
        this.state.walletId = 'phantom';
        this.state.isExternal = true;
        this.state.isConnecting = false;
        this.attachProviderEvents(provider);
        this.emit();

        await this.refreshBalance();
        return { success: true };
      }

      if (walletId === 'solflare') {
        const provider = getSolflareProvider();
        if (!provider) {
          if (isMobile && typeof window !== 'undefined') {
            const currentUrl = window.location.href;
            const deepLink = `https://solflare.com/ul/v1/browse/${encodeURIComponent(currentUrl)}`;
            window.location.href = deepLink;
            this.state.isConnecting = false;
            this.emit();
            return { success: false, redirectedToMobile: true };
          }
          throw new Error('Solflare extension not detected. Please install Solflare from solflare.com or open via Solflare mobile app.');
        }

        await provider.connect();
        const pubkeyStr = provider.publicKey ? provider.publicKey.toString() : '';
        if (!pubkeyStr) throw new Error('No public key returned from Solflare.');

        this.activeProvider = provider;
        this.state.connected = true;
        this.state.publicKey = pubkeyStr;
        this.state.walletName = 'Solflare';
        this.state.walletId = 'solflare';
        this.state.isExternal = true;
        this.state.isConnecting = false;
        this.attachProviderEvents(provider);
        this.emit();

        await this.refreshBalance();
        return { success: true };
      }

      if (walletId === 'backpack') {
        const provider = getBackpackProvider();
        if (!provider) {
          throw new Error('Backpack extension not detected. Please install Backpack from backpack.app.');
        }

        await provider.connect();
        const pubkeyStr = provider.publicKey ? provider.publicKey.toString() : '';
        if (!pubkeyStr) throw new Error('No public key returned from Backpack.');

        this.activeProvider = provider;
        this.state.connected = true;
        this.state.publicKey = pubkeyStr;
        this.state.walletName = 'Backpack';
        this.state.walletId = 'backpack';
        this.state.isExternal = true;
        this.state.isConnecting = false;
        this.attachProviderEvents(provider);
        this.emit();

        await this.refreshBalance();
        return { success: true };
      }

      if (walletId === 'standard') {
        const other = getOtherStandardProvider();
        if (!other) {
          throw new Error('No compatible standard Solana wallet provider detected.');
        }

        const provider = other.provider;
        await provider.connect();
        const pubkeyStr = provider.publicKey ? provider.publicKey.toString() : '';
        if (!pubkeyStr) throw new Error('No public key returned from wallet.');

        this.activeProvider = provider;
        this.state.connected = true;
        this.state.publicKey = pubkeyStr;
        this.state.walletName = other.name;
        this.state.walletId = 'standard';
        this.state.isExternal = true;
        this.state.isConnecting = false;
        this.attachProviderEvents(provider);
        this.emit();

        await this.refreshBalance();
        return { success: true };
      }

      throw new Error(`Unsupported wallet identifier: ${walletId}`);
    } catch (err: unknown) {
      this.state.isConnecting = false;
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes('4001') ||
        msg.toLowerCase().includes('user rejected') ||
        msg.toLowerCase().includes('user cancelled')
      ) {
        this.state.error = 'Connection request was rejected in wallet.';
      } else {
        this.state.error = msg;
      }
      this.emit();
      return { success: false, error: this.state.error };
    }
  }

  private attachProviderEvents(provider: ExternalSolanaProvider) {
    if (!provider || typeof provider.on !== 'function') return;

    provider.on('accountChanged', (publicKey: any) => {
      if (publicKey) {
        const keyStr = typeof publicKey.toString === 'function' ? publicKey.toString() : String(publicKey);
        this.state.publicKey = keyStr;
        this.refreshBalance().catch(() => {});
      } else {
        this.disconnect().catch(() => {});
      }
    });

    provider.on('disconnect', () => {
      this.disconnect().catch(() => {});
    });
  }

  /**
   * Connect to an installed browser extension wallet (Phantom, Solflare, Backpack)
   */
  public async connectBrowserWallet(): Promise<boolean> {
    if (getPhantomProvider()) {
      const res = await this.connectWallet('phantom');
      return res.success;
    }
    if (getSolflareProvider()) {
      const res = await this.connectWallet('solflare');
      return res.success;
    }
    if (getBackpackProvider()) {
      const res = await this.connectWallet('backpack');
      return res.success;
    }
    const res = await this.connectWallet('phantom');
    return res.success;
  }

  /**
   * Disconnect the active wallet
   */
  public async disconnect(): Promise<void> {
    try {
      if (this.activeProvider && typeof this.activeProvider.disconnect === 'function') {
        await this.activeProvider.disconnect();
      }
    } catch {
      // ignore
    }

    this.activeProvider = null;

    this.state = {
      connected: false,
      publicKey: null,
      walletName: null,
      walletId: null,
      balanceLamports: null,
      isConnecting: false,
      error: null,
      network: 'devnet',
      isExternal: false,
    };
    this.emit();
  }

  /**
   * Request 1 SOL Airdrop on Solana Devnet following the official RPC mechanism:
   * https://solana.com/docs/rpc/http/requestairdrop
   * 
   * Strict protocol:
   * 1. Validate target public key (uses active wallet or specific target key).
   * 2. Confirm request targets Solana Devnet.
   * 3. Request supported amount of Devnet SOL (1 SOL).
   * 4. Obtain actual transaction signature.
   * 5. Wait for transaction confirmation.
   * 6. Fetch updated balance from RPC.
   * 7. Separate airdrop errors from balance refresh failures.
   */
  public async requestAirdrop(targetPublicKey?: string): Promise<AirdropResult> {
    const targetKeyStr = targetPublicKey || this.state.publicKey;
    if (!targetKeyStr) {
      return {
        success: false,
        errorCode: 'NO_WALLET',
        error: 'No Devnet wallet connected. Please connect or launch a Devnet sandbox wallet.',
        balanceRefreshed: false,
      };
    }

    // 1. Validate target public key
    let pubkey: PublicKey;
    try {
      pubkey = new PublicKey(targetKeyStr);
    } catch {
      return {
        success: false,
        errorCode: 'INVALID_KEY',
        error: `Invalid Solana public key: ${targetKeyStr}`,
        balanceRefreshed: false,
      };
    }

    // 2. Confirm cluster is Devnet
    const isDevnet = this.state.network === 'devnet' || MAGICBLOCK_CONFIG.solanaCluster === 'devnet';
    if (!isDevnet) {
      return {
        success: false,
        errorCode: 'NOT_DEVNET',
        error: 'Airdrop is supported strictly on Solana Devnet.',
        balanceRefreshed: false,
      };
    }

    // 3. Request supported amount of Devnet SOL (1 SOL = 1,000,000,000 lamports)
    const airdropLamports = 1 * LAMPORTS_PER_SOL;
    let signature: string;

    try {
      signature = await this.connection.requestAirdrop(pubkey, airdropLamports);
    } catch (err: unknown) {
      const errStr = err instanceof Error ? err.message : String(err);

      if (
        errStr.includes('429') ||
        errStr.toLowerCase().includes('too many requests') ||
        errStr.toLowerCase().includes('rate limit') ||
        errStr.toLowerCase().includes('airdrop limit')
      ) {
        return {
          success: false,
          errorCode: 'RATE_LIMITED',
          error:
            "Solana Devnet faucet daily rate limit reached for this IP or wallet. Please visit https://faucet.solana.com or https://solfaucet.com for alternative sources.",
          faucetAlternativeUrl: 'https://faucet.solana.com',
          balanceRefreshed: false,
        };
      }

      if (
        errStr.includes('-32603') ||
        errStr.toLowerCase().includes('internal error') ||
        errStr.toLowerCase().includes('run dry') ||
        errStr.toLowerCase().includes('insufficient')
      ) {
        return {
          success: false,
          errorCode: 'INSUFFICIENT_FAUCET',
          error:
            "The public Solana Devnet faucet is currently depleted or rejecting requests. You can request test SOL directly from https://faucet.solana.com or https://solfaucet.com.",
          faucetAlternativeUrl: 'https://faucet.solana.com',
          balanceRefreshed: false,
        };
      }

      if (
        errStr.toLowerCase().includes('failed to fetch') ||
        errStr.toLowerCase().includes('network') ||
        errStr.toLowerCase().includes('econnrefused')
      ) {
        return {
          success: false,
          errorCode: 'RPC_UNAVAILABLE',
          error: 'Solana Devnet RPC endpoint is temporarily unreachable. Please check your internet connection.',
          balanceRefreshed: false,
        };
      }

      return {
        success: false,
        errorCode: 'UNKNOWN',
        error: `Devnet airdrop request failed: ${errStr.slice(0, 150)}`,
        faucetAlternativeUrl: 'https://faucet.solana.com',
        balanceRefreshed: false,
      };
    }

    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=devnet`;

    // 4 & 5. Wait for transaction confirmation
    try {
      const latestBlockhash = await this.connection.getLatestBlockhash('confirmed');
      const confirmation = await this.connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        'confirmed'
      );

      if (confirmation.value.err) {
        return {
          success: false,
          signature,
          explorerUrl,
          errorCode: 'TRANSACTION_FAILED',
          error: `Airdrop transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`,
          balanceRefreshed: false,
        };
      }
    } catch {
      // Timeout fallback: verify via getSignatureStatus
      try {
        const status = await this.connection.getSignatureStatus(signature, {
          searchTransactionHistory: true,
        });
        const isConfirmed =
          status?.value?.confirmationStatus === 'confirmed' ||
          status?.value?.confirmationStatus === 'finalized';

        if (!isConfirmed) {
          return {
            success: false,
            signature,
            explorerUrl,
            errorCode: 'CONFIRMATION_TIMEOUT',
            error:
              'Airdrop transaction was broadcast, but confirmation timed out on Devnet. Verify status via Solana Explorer.',
            balanceRefreshed: false,
          };
        }
      } catch {
        return {
          success: false,
          signature,
          explorerUrl,
          errorCode: 'CONFIRMATION_TIMEOUT',
          error:
            'Confirmation timed out. The airdrop transaction was submitted; check the Solana Explorer link.',
          balanceRefreshed: false,
        };
      }
    }

    // 6. Fetch updated balance from RPC
    let balanceRefreshed = false;
    let currentBalanceSol: number | undefined;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const updatedLamports = await this.connection.getBalance(pubkey, 'confirmed');
        if (this.state.publicKey && pubkey.toBase58() === this.state.publicKey) {
          this.state.balanceLamports = updatedLamports;
          this.emit();
        }
        balanceRefreshed = true;
        currentBalanceSol = updatedLamports / LAMPORTS_PER_SOL;
        break;
      } catch {
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }
    }

    return {
      success: true,
      signature,
      explorerUrl,
      balanceRefreshed,
      currentBalanceSol,
    };
  }

  /**
   * Refresh both native SOL and authentic Circle Devnet USDC balances from Solana RPC
   */
  public async refreshBalance(): Promise<{ lamports: number | null; usdcBaseUnits: number | null }> {
    if (!this.state.publicKey) return { lamports: null, usdcBaseUnits: null };

    try {
      const pubkey = new PublicKey(this.state.publicKey);
      
      // 1. Refresh Native SOL lamports
      const lamports = await this.connection.getBalance(pubkey, 'confirmed');
      this.state.balanceLamports = lamports;

      // 2. Refresh authentic Circle Devnet USDC token account
      try {
        const tokenProgramId = new PublicKey(TOKEN_PROGRAM_ID_STR);
        const usdcMintPubkey = new PublicKey(DEVNET_USDC_MINT);
        const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(
          pubkey,
          { programId: tokenProgramId },
          'confirmed'
        );

        let totalUsdcMicro = 0;
        for (const item of tokenAccounts.value) {
          const parsed = item.account.data.parsed?.info;
          if (parsed && parsed.mint === DEVNET_USDC_MINT) {
            const rawAmount = parsed.tokenAmount?.amount;
            if (rawAmount) {
              totalUsdcMicro += Number(rawAmount);
            }
          }
        }
        this.state.balanceUsdcBaseUnits = totalUsdcMicro;
      } catch (tokenErr) {
        // Fallback: If token account lookup fails or is rate-limited, keep previous or default to 0
        if (this.state.balanceUsdcBaseUnits === null) {
          this.state.balanceUsdcBaseUnits = 0;
        }
      }

      this.emit();
      return { lamports, usdcBaseUnits: this.state.balanceUsdcBaseUnits ?? null };
    } catch (err: unknown) {
      console.warn('Failed to refresh Devnet balance from RPC:', err);
      return {
        lamports: this.state.balanceLamports,
        usdcBaseUnits: this.state.balanceUsdcBaseUnits ?? null,
      };
    }
  }

  public getDevnetKeypair(): Keypair | null {
    return this.burnerKeypair;
  }

  public getInternalDevnetPublicKey(): string | null {
    return this.burnerKeypair ? this.burnerKeypair.publicKey.toBase58() : null;
  }

  public async getInternalDevnetBalance(): Promise<number | null> {
    if (!this.burnerKeypair) return null;
    try {
      return await this.connection.getBalance(this.burnerKeypair.publicKey, 'confirmed');
    } catch {
      return null;
    }
  }

  /**
   * Sign and send a Solana transaction using the active wallet (Phantom/Solflare/Backpack).
   * Gracefully handles user rejection without exposing private keys.
   */
  public async signAndSendTransaction(
    transaction: import('@solana/web3.js').Transaction
  ): Promise<{ signature: string }> {
    if (!this.state.connected || !this.state.publicKey) {
      throw new Error('Wallet not connected. Please connect your Solana Devnet wallet.');
    }

    const externalProvider = this.activeProvider || (typeof window !== 'undefined' ? (window as any).solana : null);

    // 1. If using installed browser extension (Phantom, Solflare, Backpack)
    if (externalProvider && (this.state.isExternal || !this.burnerKeypair)) {
      try {
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(this.state.publicKey);

        if (typeof externalProvider.signAndSendTransaction === 'function') {
          const res = await externalProvider.signAndSendTransaction(transaction);
          await this.connection.confirmTransaction(
            { signature: res.signature, blockhash, lastValidBlockHeight },
            'confirmed'
          );
          await this.refreshBalance();
          return { signature: res.signature };
        } else if (typeof externalProvider.signTransaction === 'function') {
          const signed = await externalProvider.signTransaction(transaction);
          const rawTx = signed.serialize();
          const signature = await this.connection.sendRawTransaction(rawTx, {
            skipPreflight: false,
            preflightCommitment: 'confirmed',
          });
          await this.connection.confirmTransaction(
            { signature, blockhash, lastValidBlockHeight },
            'confirmed'
          );
          await this.refreshBalance();
          return { signature };
        }
      } catch (err: unknown) {
        const errObj = err as { code?: number; message?: string };
        const msg = errObj?.message || String(err);
        if (errObj?.code === 4001 || msg.includes('User rejected') || msg.includes('cancelled')) {
          throw new Error('Transaction was cancelled by user in wallet.');
        }
        throw new Error(msg || 'Transaction signing failed in external wallet.');
      }
    }

    // 2. If using Devnet Sandbox keypair
    if (this.burnerKeypair) {
      try {
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = this.burnerKeypair.publicKey;
        transaction.sign(this.burnerKeypair);

        const rawTx = transaction.serialize();
        const signature = await this.connection.sendRawTransaction(rawTx, {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
        });

        await this.connection.confirmTransaction(
          { signature, blockhash, lastValidBlockHeight },
          'confirmed'
        );
        await this.refreshBalance();
        return { signature };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('0x1')) {
          throw new Error('Insufficient funds for transaction fees on Devnet. Request 1 SOL airdrop in Wallet page.');
        }
        throw new Error(`Sandbox transaction submission: ${message}`);
      }
    }

    throw new Error('No signing mechanism available for connected wallet.');
  }
}

export const walletService = new WalletService();
