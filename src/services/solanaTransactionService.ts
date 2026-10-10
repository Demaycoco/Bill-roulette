import { Connection, PublicKey } from '@solana/web3.js';
import { walletService } from './walletService';
import { SolanaTransactionInfo } from '../types';

class SolanaTransactionService {
  private connection: Connection;

  constructor() {
    this.connection = walletService.getConnection();
  }

  /**
   * Get valid Solana Explorer URL for Devnet
   */
  public getExplorerUrl(signature: string): string {
    return `https://explorer.solana.com/tx/${encodeURIComponent(signature)}?cluster=devnet`;
  }

  public getAccountExplorerUrl(address: string): string {
    return `https://explorer.solana.com/address/${encodeURIComponent(address)}?cluster=devnet`;
  }

  /**
   * Check whether a transaction signature has confirmed on Devnet
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

      const confirmed =
        status.value.confirmationStatus === 'confirmed' ||
        status.value.confirmationStatus === 'finalized';

      return {
        signature,
        slot: status.value.slot,
        confirmed,
        cluster: 'devnet',
        explorerUrl: this.getExplorerUrl(signature),
        programId: 'PendingProgramDeployment',
      };
    } catch {
      return null;
    }
  }

  /**
   * Fetch current cluster health
   */
  public async getDevnetHealth(): Promise<{ ok: boolean; slot?: number }> {
    try {
      const slot = await this.connection.getSlot('confirmed');
      return { ok: true, slot };
    } catch {
      return { ok: false };
    }
  }
}

export const solanaTransactionService = new SolanaTransactionService();
