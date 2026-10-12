import { PublicKey } from '@solana/web3.js';
import {
  getAuthoritativeRpcUrl,
  SOLANA_CLUSTER,
  BILL_ROULETTE_PROGRAM_ID,
  BILL_ROULETTE_PROGRAM_ID_STR,
  MAGICBLOCK_VRF_MAINNET_PROGRAM_ID,
  MAGICBLOCK_DELEGATION_MAINNET_PROGRAM_ID,
  MAGICBLOCK_MAINNET_QUEUE,
} from './solanaNetwork';

export interface MagicBlockConfig {
  solanaRpcUrl: string;
  solanaCluster: 'devnet' | 'mainnet-beta';
  billRouletteProgramId: PublicKey;
  vrfProgramId: PublicKey;
  defaultQueueAddress: string;
  ephemeralRpcUrl: string;
  isDeployedOnChain: boolean;
}

// Official MagicBlock Solana VRF Program ID verified on Solana Devnet/Mainnet
export const MAGICBLOCK_VRF_PROGRAM_ID_STR =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MAGICBLOCK_VRF_PROGRAM_ID) ||
  (typeof process !== 'undefined' && process.env?.VITE_MAGICBLOCK_VRF_PROGRAM_ID) ||
  MAGICBLOCK_VRF_MAINNET_PROGRAM_ID.toBase58();

// Official MagicBlock VRF Consumer Program ID on Solana Devnet/Mainnet
export const MAGICBLOCK_CONSUMER_PROGRAM_ID_STR =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MAGICBLOCK_CONSUMER_PROGRAM_ID) ||
  (typeof process !== 'undefined' && process.env?.VITE_MAGICBLOCK_CONSUMER_PROGRAM_ID) ||
  MAGICBLOCK_VRF_PROGRAM_ID_STR;

export { BILL_ROULETTE_PROGRAM_ID_STR };

export const MAGICBLOCK_DELEGATION_PROGRAM_ID_STR =
  MAGICBLOCK_DELEGATION_MAINNET_PROGRAM_ID.toBase58();

export const MAGICBLOCK_CONFIG: MagicBlockConfig = {
  solanaRpcUrl: getAuthoritativeRpcUrl(),
  solanaCluster: SOLANA_CLUSTER,
  billRouletteProgramId: BILL_ROULETTE_PROGRAM_ID,
  vrfProgramId: new PublicKey(MAGICBLOCK_VRF_PROGRAM_ID_STR),
  defaultQueueAddress:
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MAGICBLOCK_QUEUE_ADDRESS) ||
    (typeof process !== 'undefined' && process.env?.VITE_MAGICBLOCK_QUEUE_ADDRESS) ||
    MAGICBLOCK_MAINNET_QUEUE.toBase58(),
  ephemeralRpcUrl:
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_MAGICBLOCK_EPHEMERAL_RPC_URL) ||
    (typeof process !== 'undefined' && process.env?.VITE_MAGICBLOCK_EPHEMERAL_RPC_URL) ||
    'https://devnet.magicblock.app',
  isDeployedOnChain: true,
};

/**
 * Validate required environment configuration on startup
 */
export function validateEnvironmentConfig(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  try {
    new PublicKey(BILL_ROULETTE_PROGRAM_ID_STR);
  } catch {
    errors.push(`Invalid BILL_ROULETTE_PROGRAM_ID: ${BILL_ROULETTE_PROGRAM_ID_STR}`);
  }

  try {
    new PublicKey(MAGICBLOCK_VRF_PROGRAM_ID_STR);
  } catch {
    errors.push(`Invalid MAGICBLOCK_VRF_PROGRAM_ID: ${MAGICBLOCK_VRF_PROGRAM_ID_STR}`);
  }

  return { isValid: errors.length === 0, errors };
}
