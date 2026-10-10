import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl, Keypair } from '@solana/web3.js';
import { WalletState } from '../types';

export const SOLANA_DEVNET_RPC = 'https://api.devnet.solana.com';
const STORAGE_BURNER_KEY = 'bill_roulette_devnet_burner_pk';

type WalletListener = (state: WalletState) => void;

class WalletService {
  private connection: Connection;
  private state: WalletState = {
    connected: false,
    publicKey: null,
    walletName: null,
    balanceLamports: null,
    isConnecting: false,
    error: null,
    network: 'devnet',
  };
  private listeners: Set<WalletListener> = new Set();
  private burnerKeypair: Keypair | null = null;

  constructor() {
    this.connection = new Connection(SOLANA_DEVNET_RPC, 'confirmed');
    this.initSavedState();
  }

  private initSavedState() {
    if (typeof window === 'undefined') return;
    try {
      const savedBurner = localStorage.getItem(STORAGE_BURNER_KEY);
      if (savedBurner) {
        const secret = Uint8Array.from(JSON.parse(savedBurner));
        this.burnerKeypair = Keypair.fromSecretKey(secret);
      }
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
   * Connect to an installed browser extension wallet (Phantom, Solflare, Backpack)
   */
  public async connectBrowserWallet(): Promise<boolean> {
    this.state.isConnecting = true;
    this.state.error = null;
    this.emit();

    try {
      const solana = (window as unknown as { solana?: {
        isPhantom?: boolean;
        connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
        disconnect: () => Promise<void>;
        publicKey?: { toString: () => string };
      } }).solana;

      if (!solana) {
        throw new Error('No Solana wallet found. Install Phantom or Solflare, or create a quick Devnet test wallet below.');
      }

      const response = await solana.connect();
      const pubkeyStr = response.publicKey.toString();

      this.state.connected = true;
      this.state.publicKey = pubkeyStr;
      this.state.walletName = solana.isPhantom ? 'Phantom (Devnet)' : 'Solana Wallet';
      this.state.isConnecting = false;
      this.emit();

      await this.refreshBalance();
      return true;
    } catch (err) {
      this.state.isConnecting = false;
      this.state.error = err instanceof Error ? err.message : 'Failed to connect wallet';
      this.emit();
      return false;
    }
  }

  /**
   * Generate or load a local Solana Devnet testing keypair.
   * Useful for mobile and desktop environments without extensions.
   * Strictly isolated to Devnet testing.
   */
  public async connectDevnetTestWallet(): Promise<boolean> {
    this.state.isConnecting = true;
    this.state.error = null;
    this.emit();

    try {
      if (!this.burnerKeypair) {
        this.burnerKeypair = Keypair.generate();
        localStorage.setItem(
          STORAGE_BURNER_KEY,
          JSON.stringify(Array.from(this.burnerKeypair.secretKey))
        );
      }

      const pubkeyStr = this.burnerKeypair.publicKey.toBase58();

      this.state.connected = true;
      this.state.publicKey = pubkeyStr;
      this.state.walletName = 'Devnet Keypair (Sandbox)';
      this.state.isConnecting = false;
      this.emit();

      await this.refreshBalance();
      return true;
    } catch (err) {
      this.state.isConnecting = false;
      this.state.error = err instanceof Error ? err.message : 'Failed to initialize Devnet wallet';
      this.emit();
      return false;
    }
  }

  /**
   * Disconnect the active wallet
   */
  public async disconnect(): Promise<void> {
    try {
      const solana = (window as unknown as { solana?: { disconnect: () => Promise<void> } }).solana;
      if (solana && typeof solana.disconnect === 'function') {
        await solana.disconnect();
      }
    } catch {
      // ignore
    }

    this.state = {
      connected: false,
      publicKey: null,
      walletName: null,
      balanceLamports: null,
      isConnecting: false,
      error: null,
      network: 'devnet',
    };
    this.emit();
  }

  /**
   * Request 1 SOL Airdrop on Solana Devnet
   */
  public async requestAirdrop(): Promise<{ success: boolean; signature?: string; error?: string }> {
    if (!this.state.publicKey) {
      return { success: false, error: 'Wallet not connected' };
    }

    try {
      const pubkey = new PublicKey(this.state.publicKey);
      const signature = await this.connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
      
      const latestBlockhash = await this.connection.getLatestBlockhash();
      await this.connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      }, 'confirmed');

      await this.refreshBalance();
      return { success: true, signature };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Devnet airdrop limit reached. Try again later or use solfaucet.com.';
      return { success: false, error: msg };
    }
  }

  /**
   * Refresh the balance on Solana Devnet
   */
  public async refreshBalance(): Promise<number | null> {
    if (!this.state.publicKey) return null;

    try {
      const pubkey = new PublicKey(this.state.publicKey);
      const lamports = await this.connection.getBalance(pubkey, 'confirmed');
      this.state.balanceLamports = lamports;
      this.emit();
      return lamports;
    } catch {
      return this.state.balanceLamports;
    }
  }

  public getDevnetKeypair(): Keypair | null {
    return this.burnerKeypair;
  }

  /**
   * Sign and send a Solana transaction using the active wallet (Phantom/Solflare or Devnet Sandbox).
   * Gracefully handles user rejection without exposing private keys.
   */
  public async signAndSendTransaction(
    transaction: import('@solana/web3.js').Transaction
  ): Promise<{ signature: string }> {
    if (!this.state.connected || !this.state.publicKey) {
      throw new Error('Wallet not connected. Please connect your Solana Devnet wallet.');
    }

    const solana = (window as unknown as {
      solana?: {
        signAndSendTransaction?: (
          tx: import('@solana/web3.js').Transaction
        ) => Promise<{ signature: string }>;
        signTransaction?: (
          tx: import('@solana/web3.js').Transaction
        ) => Promise<import('@solana/web3.js').Transaction>;
      };
    })?.solana;

    // 1. If using installed browser extension (Phantom, Solflare, etc.)
    if (solana && this.state.walletName?.includes('Phantom') || (solana && !this.burnerKeypair)) {
      try {
        const { blockhash, lastValidBlockHeight } =
          await this.connection.getLatestBlockhash('confirmed');
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = new PublicKey(this.state.publicKey);

        if (typeof solana.signAndSendTransaction === 'function') {
          const res = await solana.signAndSendTransaction(transaction);
          await this.connection.confirmTransaction(
            { signature: res.signature, blockhash, lastValidBlockHeight },
            'confirmed'
          );
          await this.refreshBalance();
          return { signature: res.signature };
        } else if (typeof solana.signTransaction === 'function') {
          const signed = await solana.signTransaction(transaction);
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
        if (errObj?.code === 4001 || errObj?.message?.includes('User rejected')) {
          throw new Error('Transaction was cancelled by user in wallet.');
        }
        throw new Error(errObj?.message || 'Transaction signing failed.');
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
