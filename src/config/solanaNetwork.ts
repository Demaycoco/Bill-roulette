import { Connection, Commitment, PublicKey } from '@solana/web3.js';

/**
 * AUTHORITATIVE SOLANA MAINNET BETA NETWORK CONFIGURATION
 * 
 * Strict Single-Source-of-Truth for all blockchain interactions:
 * - Wallet connections & balances
 * - Transaction creation, simulation, signing, submission, & confirmation
 * - Blockhash & slot retrieval
 * - MagicBlock VRF & Ephemeral Rollup integrations
 * - Explorer URL generation
 * - Cluster genesis hash cryptographic validation
 */

export const SOLANA_CLUSTER = 'mainnet-beta' as const;
export type SolanaCluster = typeof SOLANA_CLUSTER;

// Official Solana Mainnet Beta Genesis Hash
export const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

// Official Fallback RPC & WebSocket Endpoints
export const OFFICIAL_MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
export const OFFICIAL_MAINNET_WSS = 'wss://api.mainnet-beta.solana.com';

// Verified Mainnet Token & Core Program Addresses
export const SPL_TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const MAINNET_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// MagicBlock Mainnet Program IDs & Queue (Verified on Solana Mainnet Beta)
export const MAGICBLOCK_VRF_MAINNET_PROGRAM_ID = new PublicKey('Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz');
export const MAGICBLOCK_DELEGATION_MAINNET_PROGRAM_ID = new PublicKey('DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh');
export const MAGICBLOCK_MAINNET_QUEUE = new PublicKey('5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc');

// Custom Bill Roulette Anchor Program (Requires Mainnet deployment)
export const BILL_ROULETTE_PROGRAM_ID_STR =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BILL_ROULETTE_PROGRAM_ID) ||
  (typeof process !== 'undefined' && process.env?.VITE_BILL_ROULETTE_PROGRAM_ID) ||
  'Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq';

export const BILL_ROULETTE_PROGRAM_ID = new PublicKey(BILL_ROULETTE_PROGRAM_ID_STR);

/**
 * Resolves the authoritative production RPC endpoint.
 * Prioritizes dedicated production RPC configured via environment variables.
 * Disallows Devnet endpoints in production.
 */
export function getAuthoritativeRpcUrl(): string {
  let envRpc: string | undefined;

  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    envRpc =
      (import.meta as any).env.VITE_SOLANA_MAINNET_RPC_URL ||
      (import.meta as any).env.VITE_SOLANA_RPC_URL;
  }

  if (!envRpc && typeof process !== 'undefined' && process.env) {
    envRpc =
      process.env.SOLANA_MAINNET_RPC_URL ||
      process.env.VITE_SOLANA_MAINNET_RPC_URL ||
      process.env.VITE_SOLANA_RPC_URL;
  }

  const rpcUrl = envRpc?.trim() || OFFICIAL_MAINNET_RPC;

  // Strict check: Prevent accidental Devnet fallback
  if (rpcUrl.toLowerCase().includes('devnet.solana.com') || rpcUrl.toLowerCase().includes('api.devnet')) {
    console.error('[CRITICAL] Devnet RPC detected in production Mainnet configuration. Defaulting to official Mainnet Beta.');
    return OFFICIAL_MAINNET_RPC;
  }

  return rpcUrl;
}

/**
 * Resolves the authoritative WebSocket endpoint for subscriptions.
 */
export function getAuthoritativeWssUrl(): string {
  let envWss: string | undefined;

  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    envWss =
      (import.meta as any).env.VITE_SOLANA_MAINNET_WSS_URL ||
      (import.meta as any).env.VITE_SOLANA_WSS_URL;
  }

  if (!envWss && typeof process !== 'undefined' && process.env) {
    envWss =
      process.env.SOLANA_MAINNET_WSS_URL ||
      process.env.VITE_SOLANA_MAINNET_WSS_URL;
  }

  if (envWss?.trim()) {
    return envWss.trim();
  }

  // Derive from RPC if custom dedicated provider
  const rpcUrl = getAuthoritativeRpcUrl();
  if (rpcUrl.startsWith('https://')) {
    return rpcUrl.replace('https://', 'wss://');
  } else if (rpcUrl.startsWith('http://')) {
    return rpcUrl.replace('http://', 'ws://');
  }

  return OFFICIAL_MAINNET_WSS;
}

/**
 * Singleton authoritative connection instance
 */
let singletonConnection: Connection | null = null;

export function getAuthoritativeConnection(commitment: Commitment = 'confirmed'): Connection {
  if (!singletonConnection) {
    const rpcUrl = getAuthoritativeRpcUrl();
    const wsEndpoint = getAuthoritativeWssUrl();

    singletonConnection = new Connection(rpcUrl, {
      commitment,
      wsEndpoint,
      disableRetryOnRateLimit: true,
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return singletonConnection;
}

// Cluster verification state cache
interface ClusterVerificationCache {
  isValid: boolean;
  genesisHash: string;
  checkedAt: number;
  slot?: number;
  error?: string;
}

let clusterValidationCache: ClusterVerificationCache | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute

/**
 * Cryptographically validate that the connected RPC belongs to Solana Mainnet Beta.
 * Halts operations if genesis hash does not match 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d.
 */
export async function validateMainnetCluster(
  connection: Connection = getAuthoritativeConnection()
): Promise<{ isValid: boolean; genesisHash: string; slot?: number; error?: string }> {
  const now = Date.now();
  if (clusterValidationCache && now - clusterValidationCache.checkedAt < CACHE_TTL_MS) {
    return clusterValidationCache;
  }

  try {
    const genesisHash = await connection.getGenesisHash();
    const slot = await connection.getSlot('confirmed');

    if (genesisHash !== SOLANA_MAINNET_GENESIS_HASH) {
      const errorMsg = `Cluster validation failure: Connected RPC is NOT Solana Mainnet Beta. Expected genesis hash ${SOLANA_MAINNET_GENESIS_HASH}, but received ${genesisHash}. Blockchain operations halted.`;
      console.error(errorMsg);
      clusterValidationCache = {
        isValid: false,
        genesisHash,
        checkedAt: now,
        slot,
        error: errorMsg,
      };
      return clusterValidationCache;
    }

    clusterValidationCache = {
      isValid: true,
      genesisHash,
      slot,
      checkedAt: now,
    };
    return clusterValidationCache;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      isValid: false,
      genesisHash: 'UNKNOWN',
      error: `Failed to connect to Solana Mainnet RPC: ${errorMsg}`,
    };
  }
}

/**
 * Strict cluster assertion: throws immediately if connected cluster is not Solana Mainnet Beta.
 */
export async function assertMainnetCluster(
  connection: Connection = getAuthoritativeConnection()
): Promise<void> {
  const check = await validateMainnetCluster(connection);
  if (!check.isValid) {
    throw new Error(check.error || 'Solana Mainnet Beta cluster verification failed.');
  }
}

/**
 * Generates official Solana Mainnet Explorer URL for transactions.
 */
export function getMainnetExplorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}`;
}

/**
 * Generates official Solana Mainnet Explorer URL for accounts and contracts.
 */
export function getMainnetExplorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${encodeURIComponent(address)}`;
}

/**
 * Strict Transaction Confirmation Protocol for Solana Mainnet Beta:
 * - Uses recent blockhash & lastValidBlockHeight
 * - Validates on-chain execution result
 * - Does not treat RPC acknowledgment as proof of success
 */
export async function confirmMainnetTransactionStrict(
  connection: Connection,
  params: {
    signature: string;
    blockhash: string;
    lastValidBlockHeight: number;
    commitment?: Commitment;
  }
): Promise<{ confirmed: boolean; slot: number }> {
  const commitment = params.commitment || 'confirmed';

  const confirmation = await connection.confirmTransaction(
    {
      signature: params.signature,
      blockhash: params.blockhash,
      lastValidBlockHeight: params.lastValidBlockHeight,
    },
    commitment
  );

  // Requirement 12: Do not treat a successful RPC response as proof that a transaction has succeeded
  if (confirmation.value.err) {
    const errDetails = JSON.stringify(confirmation.value.err);
    throw new Error(`Transaction execution failed on Solana Mainnet Beta: ${errDetails}`);
  }

  return {
    confirmed: true,
    slot: confirmation.context.slot,
  };
}

/**
 * Program deployment status and verified Mainnet registry
 */
export interface ProgramRegistryItem {
  name: string;
  address: string;
  isDeployedOnMainnet: boolean;
  isCustomProgram: boolean;
  notes: string;
}

export const MAINNET_PROGRAM_REGISTRY: Record<string, ProgramRegistryItem> = {
  billRoulette: {
    name: 'Bill Roulette Custom Anchor Program',
    address: BILL_ROULETTE_PROGRAM_ID_STR,
    isDeployedOnMainnet: false,
    isCustomProgram: true,
    notes: 'Custom program written and tested on Devnet. Blocker: Requires deployment to Solana Mainnet Beta via Anchor/Solana CLI.',
  },
  magicblockVrf: {
    name: 'MagicBlock VRF Core Program',
    address: 'Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz',
    isDeployedOnMainnet: true,
    isCustomProgram: false,
    notes: 'Verified executable on Solana Mainnet Beta (BPFLoaderUpgradeab1e).',
  },
  magicblockDelegation: {
    name: 'MagicBlock Ephemeral Delegation Program',
    address: 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh',
    isDeployedOnMainnet: true,
    isCustomProgram: false,
    notes: 'Verified executable on Solana Mainnet Beta (BPFLoaderUpgradeab1e).',
  },
  magicblockQueue: {
    name: 'MagicBlock Mainnet Oracle Queue',
    address: '5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc',
    isDeployedOnMainnet: true,
    isCustomProgram: false,
    notes: 'Verified account on Solana Mainnet Beta owned by Delegation Program.',
  },
  splToken: {
    name: 'Solana SPL Token Program',
    address: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    isDeployedOnMainnet: true,
    isCustomProgram: false,
    notes: 'Standard Solana Mainnet token program.',
  },
  usdcMint: {
    name: 'Circle Official Mainnet USDC Mint',
    address: MAINNET_USDC_MINT,
    isDeployedOnMainnet: true,
    isCustomProgram: false,
    notes: 'Official Circle 6-decimal USDC on Solana Mainnet Beta.',
  },
};
