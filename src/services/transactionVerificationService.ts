import { VerificationState, RouletteRound } from '../types';
import { solanaTransactionService } from './solanaTransactionService';

export interface VerificationResult {
  isVerifiedOnChain: boolean;
  status: VerificationState;
  displayBadge: string;
  badgeVariant: 'pending' | 'success' | 'dev_test' | 'warning';
  details: string;
  explorerUrl?: string;
}

class TransactionVerificationService {
  /**
   * Verify the authenticity of a roulette round result.
   * Strictly enforces blockchain integrity rules:
   * - No fake signatures
   * - Real RPC check when signature is provided
   * - Clear 'Blockchain integration pending' when Anchor contract is not deployed
   */
  public async evaluateRoundVerification(round: RouletteRound): Promise<VerificationResult> {
    // If no transaction signature exists:
    if (!round.transactionSignature) {
      if (round.isDevelopmentOnly) {
        return {
          isVerifiedOnChain: false,
          status: 'dev_cryptographic_test',
          displayBadge: 'Dev Cryptographic Beacon',
          badgeVariant: 'dev_test',
          details: 'Winner determined by SHA-256 Web Crypto beacon (Sandbox Simulation). No on-chain transaction was emitted.',
        };
      }

      return {
        isVerifiedOnChain: false,
        status: 'blockchain_pending',
        displayBadge: 'Blockchain Integration Pending',
        badgeVariant: 'pending',
        details: 'Anchor program & MagicBlock VRF contracts are configured for Solana Mainnet Beta deployment. Result determined via cryptographic client seed.',
      };
    }

    // A signature was provided — check with Solana Mainnet RPC
    try {
      const txInfo = await solanaTransactionService.verifyTransactionOnChain(round.transactionSignature);

      if (txInfo && txInfo.confirmed) {
        return {
          isVerifiedOnChain: true,
          status: 'verified_on_chain',
          displayBadge: 'Verified on Devnet',
          badgeVariant: 'success',
          details: `Confirmed on Solana Devnet at slot #${txInfo.slot}. Verified on-chain.`,
          explorerUrl: txInfo.explorerUrl,
        };
      } else {
        return {
          isVerifiedOnChain: false,
          status: 'blockchain_pending',
          displayBadge: 'Pending RPC Confirmation',
          badgeVariant: 'warning',
          details: 'Transaction submitted to Solana Devnet, awaiting block finalization.',
          explorerUrl: solanaTransactionService.getExplorerUrl(round.transactionSignature),
        };
      }
    } catch {
      return {
        isVerifiedOnChain: false,
        status: 'blockchain_pending',
        displayBadge: 'Verification Unreachable',
        badgeVariant: 'warning',
        details: 'Solana Devnet RPC could not be reached to verify this signature.',
      };
    }
  }
}

export const transactionVerificationService = new TransactionVerificationService();
