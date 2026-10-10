import { PublicKey } from '@solana/web3.js';

export interface MagicBlockConfig {
  solanaRpcUrl: string;
  solanaCluster: 'devnet' | 'mainnet-beta' | 'localnet';
  billRouletteProgramId: PublicKey;
  vrfProgramId: PublicKey;
  defaultQueueAddress: string;
  ephemeralRpcUrl: string;
  isDeployedOnChain: boolean;
}

// Official MagicBlock Solana VRF Program ID verified on Solana Devnet
export const MAGICBLOCK_VRF_PROGRAM_ID_STR =
  (typeof process !== 'undefined' && process.env?.VITE_MAGICBLOCK_VRF_PROGRAM_ID) ||
  'Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz';

export const BILL_ROULETTE_PROGRAM_ID_STR =
  (typeof process !== 'undefined' && process.env?.VITE_BILL_ROULETTE_PROGRAM_ID) ||
  'Ey54kdCeHW4PVT3cKDm2TKFmPrWWdqB2GysVSyiJpxHq';

export const MAGICBLOCK_DELEGATION_PROGRAM_ID_STR = 'DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh';

export const MAGICBLOCK_CONFIG: MagicBlockConfig = {
  solanaRpcUrl:
    (typeof process !== 'undefined' && process.env?.VITE_SOLANA_RPC_URL) ||
    'https://api.devnet.solana.com',
  solanaCluster: 'devnet',
  billRouletteProgramId: new PublicKey(BILL_ROULETTE_PROGRAM_ID_STR),
  vrfProgramId: new PublicKey(MAGICBLOCK_VRF_PROGRAM_ID_STR),
  defaultQueueAddress: 'DEFAULT_QUEUE',
  ephemeralRpcUrl:
    (typeof process !== 'undefined' && process.env?.VITE_MAGICBLOCK_EPHEMERAL_RPC_URL) ||
    'https://devnet.magicblock.app',
  isDeployedOnChain: false, // Honesty flag: false until custom Anchor program is deployed via anchor deploy CLI
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
