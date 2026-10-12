import { Connection } from '@solana/web3.js';
import { SolanaTransactionInfo } from '../types';
import { MAGICBLOCK_CONFIG } from '../config/magicblock';
import {
  getAuthoritativeConnection,
  getMainnetExplorerTxUrl,
  getMainnetExplorerAddressUrl,
  validateMainnetCluster,
} from '../config/solanaNetwork';

class SolanaTransactionService {
  private connection: Connection;

  constructor() {
    this.connection = getAuthoritativeConnection();
  }

  /**
   * Get authoritative Solana Explorer URL for Mainnet Beta (no cluster param needed on mainnet)
   */
  public getExplorerUrl(signature: string): string {
    return getMainnetExplorerTxUrl(signature);
  }

  public getAccountExplorerUrl(address: string): string {
    return getMainnetExplorerAddressUrl(address);
  }

  /**
   * Check whether a transaction signature has confirmed on Solana Mainnet Beta
   */
  public async verifyTransactionOnChain(signature: string): Promise<SolanaTransactionInfo | null> {
    try {
      if (!signature || signature.length < 32) return null;

      const status = await this.connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });

      if (!status || !status.value) {
        return null;
      }

      // Requirement 12: Check if transaction encountered an on-chain execution error
      if (status.value.err) {
        return {
          signature,
          slot: status.value.slot,
          confirmed: false,
          cluster: 'mainnet-beta',
          explorerUrl: this.getExplorerUrl(signature),
          programId: MAGICBLOCK_CONFIG.vrfProgramId.toBase58(),
        };
      }

      const confirmed =
        status.value.confirmationStatus === 'confirmed' ||
        status.value.confirmationStatus === 'finalized';

      return {
        signature,
        slot: status.value.slot,
        confirmed,
        cluster: 'mainnet-beta',
        explorerUrl: this.getExplorerUrl(signature),
        programId: MAGICBLOCK_CONFIG.vrfProgramId.toBase58(),
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch current cluster health and cryptographically validate Mainnet genesis hash
   */
  public async getClusterHealth(): Promise<{ ok: boolean; slot?: number; error?: string }> {
    const clusterCheck = await validateMainnetCluster(this.connection);
    if (!clusterCheck.isValid) {
      return { ok: false, error: clusterCheck.error };
    }
    return { ok: true, slot: clusterCheck.slot };
  }

  // Alias for backward compatibility
  public async getDevnetHealth(): Promise<{ ok: boolean; slot?: number }> {
    return this.getClusterHealth();
  }
}

export const solanaTransactionService = new SolanaTransactionService();
